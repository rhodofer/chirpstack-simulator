package api

import (
	"database/sql"
	"fmt"
	"time"

	log "github.com/sirupsen/logrus"
	_ "modernc.org/sqlite"
)

var db *sql.DB

// SetupDB opens the SQLite database and initializes tables.
func SetupDB() error {
	var err error
	db, err = sql.Open("sqlite", "simulator.db")
	if err != nil {
		return fmt.Errorf("sqlite open error: %w", err)
	}

	// Enable WAL mode and other optimizations
	if _, err := db.Exec("PRAGMA journal_mode=WAL;"); err != nil {
		return fmt.Errorf("failed to set WAL mode: %w", err)
	}
	if _, err := db.Exec("PRAGMA synchronous=NORMAL;"); err != nil {
		return fmt.Errorf("failed to set synchronous: %w", err)
	}
	if _, err := db.Exec("PRAGMA busy_timeout=5000;"); err != nil {
		return fmt.Errorf("failed to set busy_timeout: %w", err)
	}

	// Create configurations table
	query := `
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

	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("create table error: %w", err)
	}

	// Dynamic migrations for existing databases
	_, _ = db.Exec("ALTER TABLE org_configs ADD COLUMN payload_script TEXT;")
	_, _ = db.Exec("ALTER TABLE org_configs ADD COLUMN packet_loss REAL DEFAULT 0;")
	_, _ = db.Exec("ALTER TABLE org_configs ADD COLUMN simulate_packet_loss INTEGER DEFAULT 0;")
	_, _ = db.Exec("ALTER TABLE org_configs ADD COLUMN latency_ms INTEGER DEFAULT 0;")
	_, _ = db.Exec("ALTER TABLE org_configs ADD COLUMN anomaly_probability REAL DEFAULT 0;")
	_, _ = db.Exec("ALTER TABLE org_configs ADD COLUMN anomaly_types TEXT DEFAULT '';")
	_, _ = db.Exec("ALTER TABLE org_configs ADD COLUMN anomaly_duration INTEGER DEFAULT 0;")

	queryIntervals := `
	CREATE TABLE IF NOT EXISTS device_intervals (
		dev_eui TEXT PRIMARY KEY,
		interval TEXT NOT NULL,
		updated_at DATETIME
	);`
	if _, err := db.Exec(queryIntervals); err != nil {
		return fmt.Errorf("create device_intervals table error: %w", err)
	}

	querySystemStates := `
	CREATE TABLE IF NOT EXISTS system_states (
		key TEXT PRIMARY KEY,
		value TEXT,
		updated_at DATETIME
	);`
	if _, err := db.Exec(querySystemStates); err != nil {
		return fmt.Errorf("create system_states table error: %w", err)
	}

	log.Info("sqlite: database initialized successfully")
	return nil
}

// GetOrgConfig retrieves simulation config for a given organization ID.
func GetOrgConfig(orgID string) (*StartRequest, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
	SELECT 
		tenant_id, device_count, gateway_count, duration, activation_time, 
		uplink_interval, app_name, device_prefix, f_port, payload, payload_script, packet_loss, simulate_packet_loss, latency_ms,
		frequency, bandwidth, spreading_factor, event_topic_template, command_topic_template,
		anomaly_probability, anomaly_types, anomaly_duration
	FROM org_configs 
	WHERE org_id = ?;`

	row := db.QueryRow(query, orgID)

	var cfg StartRequest
	var fPort int
	var payloadScript sql.NullString
	var simulatePacketLoss sql.NullInt64
	var anomalyProbability sql.NullFloat64
	var anomalyTypes sql.NullString
	var anomalyDuration sql.NullInt64

	err := row.Scan(
		&cfg.TenantID, &cfg.DeviceCount, &cfg.GatewayCount, &cfg.Duration, &cfg.ActivationTime,
		&cfg.UplinkInterval, &cfg.AppName, &cfg.DevicePrefix, &fPort, &cfg.Payload, &payloadScript, &cfg.PacketLoss, &simulatePacketLoss, &cfg.LatencyMs,
		&cfg.Frequency, &cfg.Bandwidth, &cfg.SpreadingFactor, &cfg.EventTopicTemplate, &cfg.CommandTopicTemplate,
		&anomalyProbability, &anomalyTypes, &anomalyDuration,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	cfg.PayloadScript = payloadScript.String
	cfg.SimulatePacketLoss = simulatePacketLoss.Int64 != 0
	cfg.FPort = uint8(fPort)
	cfg.AnomalyProbability = anomalyProbability.Float64
	cfg.AnomalyTypes = anomalyTypes.String
	cfg.AnomalyDuration = int(anomalyDuration.Int64)
	return &cfg, nil
}

// SaveOrgConfig inserts or updates simulation config for a given organization ID.
func SaveOrgConfig(orgID string, cfg *StartRequest) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	// Sanitize network degradation values (max 100% loss, max 5000ms latency)
	if cfg.PacketLoss < 0 {
		cfg.PacketLoss = 0
	} else if cfg.PacketLoss > 100 {
		cfg.PacketLoss = 100
	}
	if cfg.LatencyMs < 0 {
		cfg.LatencyMs = 0
	} else if cfg.LatencyMs > 5000 {
		cfg.LatencyMs = 5000
	}

	query := `
	INSERT INTO org_configs (
		org_id, tenant_id, device_count, gateway_count, duration, activation_time, 
		uplink_interval, app_name, device_prefix, f_port, payload, payload_script, packet_loss, simulate_packet_loss, latency_ms,
		frequency, bandwidth, spreading_factor, event_topic_template, command_topic_template,
		anomaly_probability, anomaly_types, anomaly_duration, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(org_id) DO UPDATE SET
		tenant_id = excluded.tenant_id,
		device_count = excluded.device_count,
		gateway_count = excluded.gateway_count,
		duration = excluded.duration,
		activation_time = excluded.activation_time,
		uplink_interval = excluded.uplink_interval,
		app_name = excluded.app_name,
		device_prefix = excluded.device_prefix,
		f_port = excluded.f_port,
		payload = excluded.payload,
		payload_script = excluded.payload_script,
		packet_loss = excluded.packet_loss,
		simulate_packet_loss = excluded.simulate_packet_loss,
		latency_ms = excluded.latency_ms,
		frequency = excluded.frequency,
		bandwidth = excluded.bandwidth,
		spreading_factor = excluded.spreading_factor,
		event_topic_template = excluded.event_topic_template,
		command_topic_template = excluded.command_topic_template,
		anomaly_probability = excluded.anomaly_probability,
		anomaly_types = excluded.anomaly_types,
		anomaly_duration = excluded.anomaly_duration,
		updated_at = excluded.updated_at;`

	simulatePacketLossVal := 0
	if cfg.SimulatePacketLoss {
		simulatePacketLossVal = 1
	}

	_, err := db.Exec(
		query,
		orgID, cfg.TenantID, cfg.DeviceCount, cfg.GatewayCount, cfg.Duration, cfg.ActivationTime,
		cfg.UplinkInterval, cfg.AppName, cfg.DevicePrefix, int(cfg.FPort), cfg.Payload, cfg.PayloadScript, cfg.PacketLoss, simulatePacketLossVal, cfg.LatencyMs,
		cfg.Frequency, cfg.Bandwidth, cfg.SpreadingFactor, cfg.EventTopicTemplate, cfg.CommandTopicTemplate,
		cfg.AnomalyProbability, cfg.AnomalyTypes, cfg.AnomalyDuration,
		time.Now(),
	)
	return err
}

// GetActiveOrgConfigs retrieves all saved simulation configs from the database.
func GetActiveOrgConfigs() ([]StartRequest, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `
	SELECT 
		tenant_id, device_count, gateway_count, duration, activation_time, 
		uplink_interval, app_name, device_prefix, f_port, payload, payload_script, packet_loss, simulate_packet_loss, latency_ms,
		frequency, bandwidth, spreading_factor, event_topic_template, command_topic_template,
		anomaly_probability, anomaly_types, anomaly_duration
	FROM org_configs;`

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []StartRequest
	for rows.Next() {
		var cfg StartRequest
		var fPort int
		var payloadScript sql.NullString
		var simulatePacketLoss sql.NullInt64
		var anomalyProbability sql.NullFloat64
		var anomalyTypes sql.NullString
		var anomalyDuration sql.NullInt64
		err := rows.Scan(
			&cfg.TenantID, &cfg.DeviceCount, &cfg.GatewayCount, &cfg.Duration, &cfg.ActivationTime,
			&cfg.UplinkInterval, &cfg.AppName, &cfg.DevicePrefix, &fPort, &cfg.Payload, &payloadScript, &cfg.PacketLoss, &simulatePacketLoss, &cfg.LatencyMs,
			&cfg.Frequency, &cfg.Bandwidth, &cfg.SpreadingFactor, &cfg.EventTopicTemplate, &cfg.CommandTopicTemplate,
			&anomalyProbability, &anomalyTypes, &anomalyDuration,
		)
		if err != nil {
			return nil, err
		}
		cfg.PayloadScript = payloadScript.String
		cfg.SimulatePacketLoss = simulatePacketLoss.Int64 != 0
		cfg.FPort = uint8(fPort)
		cfg.AnomalyProbability = anomalyProbability.Float64
		cfg.AnomalyTypes = anomalyTypes.String
		cfg.AnomalyDuration = int(anomalyDuration.Int64)
		configs = append(configs, cfg)
	}

	return configs, nil
}

// GetDeviceIntervals retrieves all custom device intervals.
func GetDeviceIntervals() (map[string]string, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	query := `SELECT dev_eui, interval FROM device_intervals;`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	intervals := make(map[string]string)
	for rows.Next() {
		var devEUI, interval string
		if err := rows.Scan(&devEUI, &interval); err != nil {
			return nil, err
		}
		intervals[devEUI] = interval
	}
	return intervals, nil
}

// SaveDeviceInterval saves or updates the custom interval for a device.
func SaveDeviceInterval(devEUI string, interval string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	query := `
	INSERT INTO device_intervals (dev_eui, interval, updated_at)
	VALUES (?, ?, ?)
	ON CONFLICT(dev_eui) DO UPDATE SET
		interval = excluded.interval,
		updated_at = excluded.updated_at;`

	_, err := db.Exec(query, devEUI, interval, time.Now())
	return err
}

// GetSystemState retrieves a system state value for a given key.
func GetSystemState(key string) (string, error) {
	if db == nil {
		return "", fmt.Errorf("database not initialized")
	}

	var val string
	err := db.QueryRow("SELECT value FROM system_states WHERE key = ?", key).Scan(&val)
	if err == sql.ErrNoRows {
		return "", nil
	} else if err != nil {
		return "", err
	}
	return val, nil
}

// SaveSystemState saves/updates a system state key-value pair.
func SaveSystemState(key string, value string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	_, err := db.Exec(`
		INSERT INTO system_states (key, value, updated_at) 
		VALUES (?, ?, ?) 
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
		key, value, time.Now())
	return err
}

