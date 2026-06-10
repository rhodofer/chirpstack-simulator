package api

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	_ "modernc.org/sqlite"
)

func TestDeviceIntervalsHandler(t *testing.T) {
	// Setup temporary test database
	testDBPath := "test_intervals_handler.db"
	defer os.Remove(testDBPath)
	os.Remove(testDBPath)

	var err error
	db, err = sql.Open("sqlite", testDBPath)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	// Initialize table
	queryIntervals := `
	CREATE TABLE IF NOT EXISTS device_intervals (
		dev_eui TEXT PRIMARY KEY,
		interval TEXT NOT NULL,
		updated_at DATETIME
	);`
	if _, err := db.Exec(queryIntervals); err != nil {
		t.Fatalf("failed to create device_intervals table: %v", err)
	}

	// Helper dummy handler to test authentication middleware
	handler := requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			intervals, err := GetDeviceIntervals()
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]interface{}{"intervals": intervals})
		} else if r.Method == http.MethodPost {
			var req struct {
				DevEUI   string `json:"dev_eui"`
				Interval string `json:"interval"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz JSON: " + err.Error()})
				return
			}
			if req.DevEUI == "" || req.Interval == "" {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "dev_eui ve interval zorunludur"})
				return
			}
			if err := SaveDeviceInterval(req.DevEUI, req.Interval); err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"status": "success"})
		}
	}))

	// 1. GET unauthenticated
	t.Run("GET Unauthenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/device-intervals", nil)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		if w.Result().StatusCode != http.StatusUnauthorized {
			t.Errorf("Expected status 401, got %d", w.Result().StatusCode)
		}
	})

	// 2. POST authenticated - Create Interval
	t.Run("POST Authenticated Create", func(t *testing.T) {
		body, _ := json.Marshal(map[string]string{
			"dev_eui":  "0102030405060708",
			"interval": "5m",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/device-intervals", bytes.NewReader(body))
		req.AddCookie(&http.Cookie{Name: "sim_session", Value: sessionToken})
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Result().StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Result().StatusCode)
		}

		// Verify in database
		intervals, err := GetDeviceIntervals()
		if err != nil {
			t.Fatalf("failed to retrieve intervals: %v", err)
		}
		if val, ok := intervals["0102030405060708"]; !ok || val != "5m" {
			t.Errorf("expected interval 5m, got %s", val)
		}
	})

	// 3. GET authenticated
	t.Run("GET Authenticated List", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/device-intervals", nil)
		req.AddCookie(&http.Cookie{Name: "sim_session", Value: sessionToken})
		w := httptest.NewRecorder()

		handler.ServeHTTP(w, req)

		if w.Result().StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", w.Result().StatusCode)
		}

		var resp struct {
			Intervals map[string]string `json:"intervals"`
		}
		if err := json.NewDecoder(w.Result().Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}

		if val, ok := resp.Intervals["0102030405060708"]; !ok || val != "5m" {
			t.Errorf("expected intervals map to contain 0102030405060708 with 5m, got %v", resp.Intervals)
		}
	})
}
