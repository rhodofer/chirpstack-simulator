package simulator

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	dto "github.com/prometheus/client_model/go"
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

// GetMetrics returns the current simulation counters summed across all tenants.
func GetMetrics() map[string]float64 {
	vals := make(map[string]float64)
	vals["device_uplink_count"] = getCounterVecSum(ducVec)
	vals["device_join_request_count"] = getCounterVecSum(djrcVec)
	vals["device_join_accept_count"] = getCounterVecSum(djacVec)
	vals["gateway_uplink_count"] = getCounterVecSum(gucVec)
	vals["gateway_downlink_count"] = getCounterVecSum(gdcVec)
	return vals
}

func getCounterVecSum(cv *prometheus.CounterVec) float64 {
	ch := make(chan prometheus.Metric, 1000)
	cv.Collect(ch)
	close(ch)
	var sum float64
	for m := range ch {
		var dtoMetric dto.Metric
		if err := m.Write(&dtoMetric); err == nil {
			sum += dtoMetric.GetCounter().GetValue()
		}
	}
	return sum
}
