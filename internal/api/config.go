package api

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/brocaar/chirpstack-simulator/internal/config"
	"github.com/brocaar/chirpstack-simulator/internal/ns"
	"github.com/pelletier/go-toml"
	log "github.com/sirupsen/logrus"
)

// SystemConfigRequest defines the shape of get/save request for system credentials.
type SystemConfigRequest struct {
	APIKey                string `json:"api_key"`
	APIServer             string `json:"api_server"`
	APIInsecure           bool   `json:"api_insecure"`
	IntegrationMQTTServer string `json:"integration_mqtt_server"`
	GatewayMQTTServer     string `json:"gateway_mqtt_server"`
}

// handleGetSystemConfig retrieves current system configurations.
func handleGetSystemConfig(w http.ResponseWriter, r *http.Request) {
	resp := SystemConfigRequest{
		APIKey:                config.C.ChirpStack.API.APIKey,
		APIServer:             config.C.ChirpStack.API.Server,
		APIInsecure:           config.C.ChirpStack.API.Insecure,
		IntegrationMQTTServer: config.C.ChirpStack.Integration.MQTT.Server,
		GatewayMQTTServer:     config.C.ChirpStack.Gateway.Backend.MQTT.Server,
	}
	writeJSON(w, http.StatusOK, resp)
}

// handleSaveSystemConfig validates and saves the system configurations.
func handleSaveSystemConfig(w http.ResponseWriter, r *http.Request) {
	var req SystemConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON: " + err.Error()})
		return
	}

	// Backup current config in case of connection failure
	oldAPIKey := config.C.ChirpStack.API.APIKey
	oldAPIServer := config.C.ChirpStack.API.Server
	oldAPIInsecure := config.C.ChirpStack.API.Insecure
	oldIntegrationMQTTServer := config.C.ChirpStack.Integration.MQTT.Server
	oldGatewayMQTTServer := config.C.ChirpStack.Gateway.Backend.MQTT.Server

	// Apply to in-memory config
	config.C.ChirpStack.API.APIKey = req.APIKey
	config.C.ChirpStack.API.Server = req.APIServer
	config.C.ChirpStack.API.Insecure = req.APIInsecure
	config.C.ChirpStack.Integration.MQTT.Server = req.IntegrationMQTTServer
	config.C.ChirpStack.Gateway.Backend.MQTT.Server = req.GatewayMQTTServer

	// Test connection
	if err := as.Setup(config.C); err != nil {
		// Revert
		config.C.ChirpStack.API.APIKey = oldAPIKey
		config.C.ChirpStack.API.Server = oldAPIServer
		config.C.ChirpStack.API.Insecure = oldAPIInsecure
		config.C.ChirpStack.Integration.MQTT.Server = oldIntegrationMQTTServer
		_ = as.Setup(config.C) // Restore client connection

		log.WithError(err).Error("config: failed to connect to ChirpStack API")
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ChirpStack API bağlantısı başarısız oldu: " + err.Error()})
		return
	}

	if err := ns.Setup(config.C); err != nil {
		// Revert
		config.C.ChirpStack.API.APIKey = oldAPIKey
		config.C.ChirpStack.API.Server = oldAPIServer
		config.C.ChirpStack.API.Insecure = oldAPIInsecure
		config.C.ChirpStack.Integration.MQTT.Server = oldIntegrationMQTTServer
		config.C.ChirpStack.Gateway.Backend.MQTT.Server = oldGatewayMQTTServer
		_ = as.Setup(config.C)
		_ = ns.Setup(config.C)

		log.WithError(err).Error("config: failed to connect to MQTT broker")
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "MQTT Gateway bağlantısı başarısız oldu: " + err.Error()})
		return
	}

	// Connections succeeded, save to file
	cfgPath := config.CfgFile
	if cfgPath == "" {
		if _, err := os.Stat("simulator.toml"); err == nil {
			cfgPath = "simulator.toml"
		} else if _, err := os.Stat("chirpstack-simulator.toml"); err == nil {
			cfgPath = "chirpstack-simulator.toml"
		} else {
			cfgPath = "simulator.toml"
		}
	}

	data, err := toml.Marshal(config.C)
	if err != nil {
		log.WithError(err).Error("config: marshal error")
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Yapılandırma TOML dönüştürme hatası: " + err.Error()})
		return
	}

	if err := os.WriteFile(cfgPath, data, 0644); err != nil {
		log.WithError(err).WithField("path", cfgPath).Error("config: write file error")
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Yapılandırma dosyası yazma hatası: " + err.Error()})
		return
	}

	log.WithField("path", cfgPath).Info("config: configuration updated and saved successfully")
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
