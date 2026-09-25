package as

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	"github.com/brocaar/chirpstack-simulator/internal/config"
	"github.com/chirpstack/chirpstack/api/go/v4/api"
)

// backendWebhookURL: Backend webhook URL (env: FALT_BACKEND_URL veya sabit fallback)
var backendWebhookURL = func() string {
	if u := os.Getenv("FALT_BACKEND_URL"); u != "" {
		return strings.TrimRight(u, "/") + "/api/v1/webhook/chirpstack/uplink"
	}
	return "http://100.64.0.3:8000/api/v1/webhook/chirpstack/uplink"
}()

// backendWebhookSecret: Bearer token for backend auth (env: CHIRPSTACK_WEBHOOK_SECRET)
var backendWebhookSecret = func() string {
	if s := os.Getenv("CHIRPSTACK_WEBHOOK_SECRET"); s != "" {
		return s
	}
	return "falt_secure_webhook_2026_x86"
}()

// forwardToBackend sends the raw ChirpStack MQTT payload to the backend webhook asynchronously.
func forwardToBackend(rawPayload []byte, devName, devEUI string) {
	go func() {
		client := &http.Client{Timeout: 10 * time.Second}
		req, err := http.NewRequest(http.MethodPost, backendWebhookURL, bytes.NewReader(rawPayload))
		if err != nil {
			log.WithError(err).Warnf("as/integration: forward HTTP request build error (%s)", devEUI)
			return
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+backendWebhookSecret)

		resp, err := client.Do(req)
		if err != nil {
			log.WithFields(log.Fields{
				"dev_eui":     devEUI,
				"device_name": devName,
				"target":      backendWebhookURL,
			}).Warnf("as/integration: [HTTP Webhook] Backend'e iletim hatasi: %v", err)
			return
		}
		defer resp.Body.Close()
		_, _ = io.Copy(io.Discard, resp.Body)

		log.WithFields(log.Fields{
			"dev_eui":     devEUI,
			"device_name": devName,
			"status":      resp.StatusCode,
		}).Infof("as/integration: [HTTP Webhook] Cihaz: %s (%s) → Status: %d (Target: %s)",
			devName, devEUI, resp.StatusCode, backendWebhookURL)
	}()
}

var clientConn *grpc.ClientConn
var mqttClient mqtt.Client

type jwtCredentials struct {
	token string
}

func (j *jwtCredentials) GetRequestMetadata(ctx context.Context, url ...string) (map[string]string, error) {
	return map[string]string{
		"authorization": "Bearer " + j.token,
	}, nil
}

func (j *jwtCredentials) RequireTransportSecurity() bool {
	return false
}

// Setup configures the AS API client.
func Setup(c config.Config) error {
	conf := c.ChirpStack

	// Disconnect existing client if connected
	if mqttClient != nil && mqttClient.IsConnected() {
		log.Info("as: disconnecting existing MQTT client")
		mqttClient.Disconnect(250)
	}

	if clientConn != nil {
		log.Info("as: closing existing gRPC connection")
		_ = clientConn.Close()
		clientConn = nil
	}

	// connect gRPC
	log.WithFields(log.Fields{
		"server":   conf.API.Server,
		"insecure": conf.API.Insecure,
	}).Info("as: connecting api client")

	dialOpts := []grpc.DialOption{
		grpc.WithBlock(),
		grpc.WithPerRPCCredentials(&jwtCredentials{token: conf.API.APIKey}),
	}

	if conf.API.Insecure {
		dialOpts = append(dialOpts, grpc.WithInsecure())
	} else {
		dialOpts = append(dialOpts, grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{})))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, conf.API.Server, dialOpts...)
	if err != nil {
		return errors.Wrap(err, "grpc dial error")
	}

	clientConn = conn

	// connect MQTT
	opts := mqtt.NewClientOptions()
	opts.AddBroker(conf.Integration.MQTT.Server)
	opts.SetClientID(fmt.Sprintf("chirpstack-simulator-as-%d", time.Now().UnixNano()))
	if conf.Integration.MQTT.Username != "" {
		opts.SetUsername(conf.Integration.MQTT.Username)
	}
	if conf.Integration.MQTT.Password != "" {
		opts.SetPassword(conf.Integration.MQTT.Password)
	}
	opts.SetCleanSession(true)
	opts.SetAutoReconnect(true)

	opts.SetConnectionLostHandler(func(client mqtt.Client, err error) {
		log.WithError(err).Error("as: ChirpStack MQTT connection lost")
	})

	opts.SetOnConnectHandler(func(client mqtt.Client) {
		log.Info("as: ChirpStack MQTT connection established / re-established")
		
		// Subscribe to ChirpStack integration events via wildcard application/#
		subToken := client.Subscribe("application/#", 0, handleIntegrationMessage)
		if subToken.Wait() && subToken.Error() != nil {
			log.WithError(subToken.Error()).Error("as: failed to subscribe to ChirpStack integration events topic")
		} else {
			log.Info("as: successfully subscribed to ChirpStack integration events topic (application/#)")
		}
	})

	log.WithFields(log.Fields{
		"server": conf.Integration.MQTT.Server,
	}).Info("as: connecting to mqtt broker")

	mqttClient = mqtt.NewClient(opts)
	if token := mqttClient.Connect(); token.Wait() && token.Error() != nil {
		return errors.Wrap(token.Error(), "mqtt client connect error")
	}

	return nil
}

func handleIntegrationMessage(c mqtt.Client, msg mqtt.Message) {
	topic := msg.Topic()
	payload := msg.Payload()

	// log.Infof("as/debug: RECEIVED MQTT message on topic: %s", topic)

	// Parse topic structure: application/{{application_id}}/device/{{dev_eui}}/event/{{event}}
	parts := strings.Split(topic, "/")
	if len(parts) < 6 || parts[0] != "application" || parts[2] != "device" || parts[4] != "event" {
		return
	}

	eventType := parts[5]

	type DeviceInfo struct {
		DeviceName string `json:"deviceName"`
		DevEUI     string `json:"devEui"`
	}

	type CommonFields struct {
		DeviceInfo DeviceInfo `json:"deviceInfo"`
	}

	var common CommonFields
	if err := json.Unmarshal(payload, &common); err != nil {
		log.WithFields(log.Fields{
			"topic": topic,
		}).Infof("as/integration: [ChirpStack Integration] Event raw error: %v, payload: %s", err, string(payload))
		return
	}

	devName := common.DeviceInfo.DeviceName
	devEUI := common.DeviceInfo.DevEUI
	if eventType == "up" {
		log.WithFields(log.Fields{
			"app_name":    "",
			"dev_eui":     devEUI,
			"device_name": devName,
		}).Infof("as/integration: [ChirpStack Integration] Uplink received from '%s' (%s) → ChirpStack",
			devName, devEUI)

		// MQTT'den gelen ham payload'ı backend webhook'a ilet (güvenlik ağı)
		forwardToBackend(payload, devName, devEUI)

	} else if eventType == "join" {
		log.WithFields(log.Fields{
			"dev_eui":     devEUI,
			"device_name": devName,
		}).Infof("as/integration: [ChirpStack Integration] Cihaz '%s' (%s) ChirpStack'a katildi (OTAA Join)",
			devName, devEUI)
	} else {
		log.WithFields(log.Fields{
			"dev_eui":     devEUI,
			"device_name": devName,
		}).Debugf("as/integration: [ChirpStack Integration] Cihaz '%s' (%s) olay: %s",
			devName, devEUI, eventType)
	}
}

// IsConnected reports whether the gRPC client connection is established.
func IsConnected() bool {
	return clientConn != nil
}

func Tenant() api.TenantServiceClient {
	return api.NewTenantServiceClient(clientConn)
}

func Gateway() api.GatewayServiceClient {
	return api.NewGatewayServiceClient(clientConn)
}

func DeviceProfile() api.DeviceProfileServiceClient {
	return api.NewDeviceProfileServiceClient(clientConn)
}

func Application() api.ApplicationServiceClient {
	return api.NewApplicationServiceClient(clientConn)
}

func Device() api.DeviceServiceClient {
	return api.NewDeviceServiceClient(clientConn)
}

// MQTTClient returns the MQTT client for the Application Server MQTT integration.
func MQTTClient() mqtt.Client {
	return mqttClient
}
