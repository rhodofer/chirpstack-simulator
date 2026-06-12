package api

import (
	"database/sql"
	"os"
	"testing"

	_ "modernc.org/sqlite"
)

func TestDatabaseOperations(t *testing.T) {
	// Setup temporary test database
	testDBPath := "test_simulator.db"
	defer os.Remove(testDBPath)

	// Clean up old run if any
	os.Remove(testDBPath)

	var err error
	db, err = sql.Open("sqlite", testDBPath)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	// Initialize tables using the actual structure in database.go
	queryIntervals := `
	CREATE TABLE IF NOT EXISTS device_intervals (
		dev_eui TEXT PRIMARY KEY,
		interval TEXT NOT NULL,
		updated_at DATETIME
	);`
	if _, err := db.Exec(queryIntervals); err != nil {
		t.Fatalf("failed to create device_intervals table: %v", err)
	}

	queryOrgs := `
	CREATE TABLE IF NOT EXISTS org_configs (
		org_id TEXT PRIMARY KEY,
		tenant_id TEXT,
		device_count INTEGER,
		gateway_count INTEGER,
		duration TEXT,
		activation_time TEXT,
		uplink_interval TEXT,
		app_name TEXT,
		device_prefix TEXT,
		f_port INTEGER,
		payload TEXT,
		payload_script TEXT,
		packet_loss REAL,
		simulate_packet_loss INTEGER DEFAULT 0,
		latency_ms INTEGER,
		frequency INTEGER,
		bandwidth INTEGER,
		spreading_factor INTEGER,
		event_topic_template TEXT,
		command_topic_template TEXT,
		anomaly_probability REAL DEFAULT 0,
		anomaly_types TEXT DEFAULT '',
		anomaly_duration INTEGER DEFAULT 0,
		updated_at DATETIME
	);`
	if _, err := db.Exec(queryOrgs); err != nil {
		t.Fatalf("failed to create org_configs table: %v", err)
	}

	querySystemStates := `
	CREATE TABLE IF NOT EXISTS system_states (
		key TEXT PRIMARY KEY,
		value TEXT,
		updated_at DATETIME
	);`
	if _, err := db.Exec(querySystemStates); err != nil {
		t.Fatalf("failed to create system_states table: %v", err)
	}

	// 1. Test SaveDeviceInterval & GetDeviceIntervals
	t.Run("Device Intervals", func(t *testing.T) {
		err := SaveDeviceInterval("0102030405060708", "5m")
		if err != nil {
			t.Fatalf("failed to save interval: %v", err)
		}

		intervals, err := GetDeviceIntervals()
		if err != nil {
			t.Fatalf("failed to get intervals: %v", err)
		}

		if val, ok := intervals["0102030405060708"]; !ok || val != "5m" {
			t.Errorf("expected interval 5m, got %s", val)
		}

		// Update existing
		err = SaveDeviceInterval("0102030405060708", "10m")
		if err != nil {
			t.Fatalf("failed to save updated interval: %v", err)
		}

		intervals, err = GetDeviceIntervals()
		if err != nil {
			t.Fatalf("failed to get intervals: %v", err)
		}

		if val, ok := intervals["0102030405060708"]; !ok || val != "10m" {
			t.Errorf("expected updated interval 10m, got %s", val)
		}
	})

	// 2. Test SaveOrgConfig & GetOrgConfig & GetActiveOrgConfigs
	t.Run("Org Configs", func(t *testing.T) {
		cfg := StartRequest{
			TenantID:             "tenant-xyz",
			DeviceCount:          10,
			GatewayCount:         3,
			Duration:             "1h",
			ActivationTime:       "30s",
			UplinkInterval:       "2m",
			AppName:              "test-app",
			DevicePrefix:         "test-dev",
			FPort:                10,
			Payload:              "abcdef",
			PayloadScript:        "return payload;",
			PacketLoss:           15.5,
			SimulatePacketLoss:   true,
			LatencyMs:            200,
			Frequency:            868100000,
			Bandwidth:            125000,
			SpreadingFactor:      7,
			EventTopicTemplate:   "event",
			CommandTopicTemplate: "command",
			AnomalyProbability:  5.5,
			AnomalyTypes:        "spike,flatline",
			AnomalyDuration:     10,
		}

		err := SaveOrgConfig("org-1", &cfg)
		if err != nil {
			t.Fatalf("failed to save org config: %v", err)
		}

		retCfg, err := GetOrgConfig("org-1")
		if err != nil {
			t.Fatalf("failed to get org config: %v", err)
		}

		if retCfg == nil {
			t.Fatal("expected config to be returned, got nil")
		}

		if retCfg.TenantID != "tenant-xyz" || retCfg.DeviceCount != 10 || retCfg.AppName != "test-app" ||
			retCfg.PayloadScript != "return payload;" || retCfg.PacketLoss != 15.5 ||
			retCfg.SimulatePacketLoss != true || retCfg.LatencyMs != 200 ||
			retCfg.AnomalyProbability != 5.5 || retCfg.AnomalyTypes != "spike,flatline" ||
			retCfg.AnomalyDuration != 10 {
			t.Errorf("config values mismatch: %+v", retCfg)
		}

		// Save another org config
		cfg2 := cfg
		cfg2.TenantID = "tenant-abc"
		err = SaveOrgConfig("org-2", &cfg2)
		if err != nil {
			t.Fatalf("failed to save second config: %v", err)
		}

		configs, err := GetActiveOrgConfigs()
		if err != nil {
			t.Fatalf("failed to get active configs: %v", err)
		}

		if len(configs) != 2 {
			t.Errorf("expected 2 active configs, got %d", len(configs))
		}
	})

	// 3. Test GetSystemState & SaveSystemState
	t.Run("System States", func(t *testing.T) {
		val, err := GetSystemState("test_key")
		if err != nil {
			t.Fatalf("failed to get state: %v", err)
		}
		if val != "" {
			t.Errorf("expected empty value for non-existent key, got %q", val)
		}

		err = SaveSystemState("test_key", "test_value")
		if err != nil {
			t.Fatalf("failed to save state: %v", err)
		}

		val, err = GetSystemState("test_key")
		if err != nil {
			t.Fatalf("failed to get saved state: %v", err)
		}
		if val != "test_value" {
			t.Errorf("expected test_value, got %q", val)
		}

		// Update existing
		err = SaveSystemState("test_key", "new_value")
		if err != nil {
			t.Fatalf("failed to update state: %v", err)
		}

		val, err = GetSystemState("test_key")
		if err != nil {
			t.Fatalf("failed to get updated state: %v", err)
		}
		if val != "new_value" {
			t.Errorf("expected new_value, got %q", val)
		}
	})
}
