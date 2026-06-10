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
		frequency INTEGER,
		bandwidth INTEGER,
		spreading_factor INTEGER,
		event_topic_template TEXT,
		command_topic_template TEXT,
		updated_at DATETIME
	);`
	if _, err := db.Exec(queryOrgs); err != nil {
		t.Fatalf("failed to create org_configs table: %v", err)
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
			Frequency:            868100000,
			Bandwidth:            125000,
			SpreadingFactor:      7,
			EventTopicTemplate:   "event",
			CommandTopicTemplate: "command",
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

		if retCfg.TenantID != "tenant-xyz" || retCfg.DeviceCount != 10 || retCfg.AppName != "test-app" {
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
}
