package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleListGatewaysMethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/gateways", nil)
	w := httptest.NewRecorder()

	handleListGateways(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("Expected status 405, got %d", resp.StatusCode)
	}
}

func TestHandleListGatewaysNotConnected(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/gateways", nil)
	w := httptest.NewRecorder()

	handleListGateways(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("Expected status 503, got %d", resp.StatusCode)
	}
}

func TestHandleCreateGatewayMethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/gateways", nil)
	w := httptest.NewRecorder()

	handleCreateGateway(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("Expected status 405, got %d", resp.StatusCode)
	}
}

func TestHandleCreateGatewayNotConnected(t *testing.T) {
	body, _ := json.Marshal(CreateGatewayRequest{
		ID:       "0018b27f298c4710",
		Name:     "Test Gateway",
		TenantID: "some-tenant-id",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/gateways", bytes.NewReader(body))
	w := httptest.NewRecorder()

	handleCreateGateway(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("Expected status 503, got %d", resp.StatusCode)
	}
}

func TestHandleDeleteGatewayMethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/gateways/0018b27f298c4710", nil)
	w := httptest.NewRecorder()

	handleDeleteGateway(w, req, "0018b27f298c4710")

	resp := w.Result()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("Expected status 405, got %d", resp.StatusCode)
	}
}

func TestHandleDeleteGatewayNotConnected(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/api/gateways/0018b27f298c4710", nil)
	w := httptest.NewRecorder()

	handleDeleteGateway(w, req, "0018b27f298c4710")

	resp := w.Result()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("Expected status 503, got %d", resp.StatusCode)
	}
}
