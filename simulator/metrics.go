package simulator

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	ducVec = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "device_uplink_count",
		Help: "The number of uplinks sent by the devices.",
	}, []string{"tenant_id"})

	djrcVec = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "device_join_request_count",
		Help: "The number of join-requests sent by the devices.",
	}, []string{"tenant_id"})

	djacVec = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "device_join_accept_count",
		Help: "The number of join-accepts received by the devices.",
	}, []string{"tenant_id"})

	gucVec = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "gateway_uplink_count",
		Help: "The number of uplinks sent by the gateways.",
	}, []string{"tenant_id"})

	gdcVec = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "gateway_downlink_count",
		Help: "The number of downlinks received by the gateways.",
	}, []string{"tenant_id"})
)

func DeviceUplinkCounter(tenantID string) prometheus.Counter {
	return ducVec.WithLabelValues(tenantID)
}

func DeviceJoinRequestCounter(tenantID string) prometheus.Counter {
	return djrcVec.WithLabelValues(tenantID)
}

func DeviceJoinAcceptCounter(tenantID string) prometheus.Counter {
	return djacVec.WithLabelValues(tenantID)
}

func GatewayUplinkCounter(tenantID string) prometheus.Counter {
	return gucVec.WithLabelValues(tenantID)
}

func GatewayDownlinkCounter(tenantID string) prometheus.Counter {
	return gdcVec.WithLabelValues(tenantID)
}

func DeviceUplinkCounterVec() *prometheus.CounterVec {
	return ducVec
}

func DeviceJoinRequestCounterVec() *prometheus.CounterVec {
	return djrcVec
}

func DeviceJoinAcceptCounterVec() *prometheus.CounterVec {
	return djacVec
}

func GatewayUplinkCounterVec() *prometheus.CounterVec {
	return gucVec
}

func GatewayDownlinkCounterVec() *prometheus.CounterVec {
	return gdcVec
}
