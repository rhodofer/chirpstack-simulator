package api

import (
	"context"
	"sync"
)

// Status defines the simulation state.
type Status string

const (
	StatusIdle     Status = "idle"
	StatusStarting Status = "starting"
	StatusRunning  Status = "running"
	StatusStopping Status = "stopping"
	StatusError    Status = "error"
)

// StartRequest defines the HTTP API simulation start parameters.
type StartRequest struct {
	TenantID            string `json:"tenant_id"`
	DeviceCount         int    `json:"device_count"`
	GatewayCount        int    `json:"gateway_count"`
	Duration            string `json:"duration"`
	ActivationTime      string `json:"activation_time"`
	UplinkInterval      string `json:"uplink_interval"`
	AppName             string `json:"app_name"`
	DevicePrefix        string `json:"device_prefix"`
	FPort               uint8  `json:"f_port"`
	Payload             string `json:"payload"`
	PayloadScript       string `json:"payload_script"`
	PacketLoss          float64 `json:"packet_loss"`
	LatencyMs           int    `json:"latency_ms"`
	Frequency           int    `json:"frequency"`
	Bandwidth           int    `json:"bandwidth"`
	SpreadingFactor     int    `json:"spreading_factor"`
	EventTopicTemplate  string `json:"event_topic_template"`
	CommandTopicTemplate string `json:"command_topic_template"`
}

// SimState holds the singleton simulation state.
type SimState struct {
	mu        sync.Mutex
	Status    Status
	StartedAt int64
	Config    *StartRequest
	Wg        *sync.WaitGroup
	Cancel    context.CancelFunc
}

var instance *SimState
var once sync.Once

// GetState returns the singleton SimState instance.
func GetState() *SimState {
	once.Do(func() {
		instance = &SimState{
			Status: StatusIdle,
		}
	})
	return instance
}
