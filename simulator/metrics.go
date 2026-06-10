package simulator

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	duc = promauto.NewCounter(prometheus.CounterOpts{
		Name: "device_uplink_count",
		Help: "The number of uplinks sent by the devices.",
	})

	djrc = promauto.NewCounter(prometheus.CounterOpts{
		Name: "device_join_request_count",
		Help: "The number of join-requests sent by the devices.",
	})

	djac = promauto.NewCounter(prometheus.CounterOpts{
		Name: "device_join_accept_count",
		Help: "The number of join-accepts received by the devices.",
	})

	guc = promauto.NewCounter(prometheus.CounterOpts{
		Name: "gateway_uplink_count",
		Help: "The number of uplinks sent by the gateways.",
	})

	gdc = promauto.NewCounter(prometheus.CounterOpts{
		Name: "gateway_downlink_count",
		Help: "The number of downlinks received by the gateways.",
	})
)

func DeviceUplinkCounter() prometheus.Counter {
	return duc
}

func DeviceJoinRequestCounter() prometheus.Counter {
	return djrc
}

func DeviceJoinAcceptCounter() prometheus.Counter {
	return djac
}

func GatewayUplinkCounter() prometheus.Counter {
	return guc
}

func GatewayDownlinkCounter() prometheus.Counter {
	return gdc
}
