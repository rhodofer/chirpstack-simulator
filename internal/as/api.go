package as

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
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

	log.Infof("as/debug: RECEIVED MQTT message on topic: %s", topic)

	// Parse topic structure: application/{{application_id}}/device/{{dev_eui}}/event/{{event}}
	parts := strings.Split(topic, "/")
	if len(parts) < 6 || parts[0] != "application" || parts[2] != "device" || parts[4] != "event" {
		// Ignore topics that are not integration events
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
		type UplinkFields struct {
			FPort int    `json:"fPort"`
			FCnt  int    `json:"fCnt"`
			Data  string `json:"data"`
		}
		var up UplinkFields
		_ = json.Unmarshal(payload, &up)
		log.Infof("as/integration: [ChirpStack Integration] Cihaz '%s' (%s) ChirpStack'a veri gönderdi. FPort: %d, FCnt: %d, Base64 Data: %s",
			devName, devEUI, up.FPort, up.FCnt, up.Data)
	} else if eventType == "join" {
		log.Infof("as/integration: [ChirpStack Integration] Cihaz '%s' (%s) ChirpStack'a başarıyla katıldı (OTAA Join Accept)",
			devName, devEUI)
	} else {
		log.Infof("as/integration: [ChirpStack Integration] Cihaz '%s' (%s) olay bildirdi: %s",
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
