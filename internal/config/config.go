package config

import (
	"time"
)

// Version defines the version.
var Version string

type GeneralConfig struct {
	LogLevel int `mapstructure:"log_level" toml:"log_level"`
}

type APIConfig struct {
	APIKey   string `mapstructure:"api_key" toml:"api_key"`
	Server   string `mapstructure:"server" toml:"server"`
	Insecure bool   `mapstructure:"insecure" toml:"insecure"`
}

type MQTTConfig struct {
	Server   string `mapstructure:"server" toml:"server"`
	Username string `mapstructure:"username" toml:"username"`
	Password string `mapstructure:"password" toml:"password"`
}

type IntegrationConfig struct {
	MQTT MQTTConfig `mapstructure:"mqtt" toml:"mqtt"`
}

type GatewayConfig struct {
	Backend struct {
		MQTT MQTTConfig `mapstructure:"mqtt" toml:"mqtt"`
	} `mapstructure:"backend" toml:"backend"`
}

type ChirpStackConfig struct {
	API         APIConfig         `mapstructure:"api" toml:"api"`
	Integration IntegrationConfig `mapstructure:"integration" toml:"integration"`
	Gateway     GatewayConfig     `mapstructure:"gateway" toml:"gateway"`
}

type SimulatorDeviceConfig struct {
	Count           int           `mapstructure:"count" toml:"count"`
	UplinkInterval  time.Duration `mapstructure:"uplink_interval" toml:"uplink_interval"`
	FPort           uint8         `mapstructure:"f_port" toml:"f_port"`
	Payload         string        `mapstructure:"payload" toml:"payload"`
	Frequency       int           `mapstructure:"frequency" toml:"frequency"`
	Bandwidth       int           `mapstructure:"bandwidth" toml:"bandwidth"`
	SpreadingFactor int           `mapstructure:"spreading_factor" toml:"spreading_factor"`
}

type SimulatorGatewayConfig struct {
	MinCount             int    `mapstructure:"min_count" toml:"min_count"`
	MaxCount             int    `mapstructure:"max_count" toml:"max_count"`
	EventTopicTemplate   string `mapstructure:"event_topic_template" toml:"event_topic_template"`
	CommandTopicTemplate string `mapstructure:"command_topic_template" toml:"command_topic_template"`
}

type SimulatorConfig struct {
	TenantID         string                 `mapstructure:"tenant_id" toml:"tenant_id"`
	Duration         time.Duration          `mapstructure:"duration" toml:"duration"`
	ActivationTime   time.Duration          `mapstructure:"activation_time" toml:"activation_time"`
	AppName          string                 `mapstructure:"app_name" toml:"app_name"`
	DeviceNamePrefix string                 `mapstructure:"device_name_prefix" toml:"device_name_prefix"`
	Device           SimulatorDeviceConfig  `mapstructure:"device" toml:"device"`
	Gateway          SimulatorGatewayConfig `mapstructure:"gateway" toml:"gateway"`
}

type PrometheusConfig struct {
	Bind string `mapstructure:"bind" toml:"bind"`
}

type HTTPConfig struct {
	Bind string `mapstructure:"bind" toml:"bind"`
}

// Config defines the configuration.
type Config struct {
	General    GeneralConfig     `mapstructure:"general" toml:"general"`
	ChirpStack ChirpStackConfig  `mapstructure:"chirpstack" toml:"chirpstack"`
	Simulator  []SimulatorConfig `mapstructure:"simulator" toml:"simulator"`
	Prometheus PrometheusConfig  `mapstructure:"prometheus" toml:"prometheus"`
	HTTP       HTTPConfig        `mapstructure:"http" toml:"http"`
}

type DeviceConfig struct {
	DevEUI         string        `mapstructure:"dev_eui"`
	AppKey         string        `mapstructure:"app_key"`
	UplinkInterval time.Duration `mapstructure:"uplink_interval"`
	FPort          uint8         `mapstructure:"f_port"`
	Payload        string        `mapstructure:"payload"`
}

// C holds the global configuration.
var C Config

// CfgFile holds the loaded config file path.
var CfgFile string
