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
		frequency INTEGER,
		bandwidth INTEGER,
		spreading_factor INTEGER,
		event_topic_template TEXT,
		command_topic_template TEXT,
		updated_at DATETIME
	);`

	if _, err := db.Exec(query); err != nil {
		return fmt.Errorf("create table error: %w", err)
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
		uplink_interval, app_name, device_prefix, f_port, payload, 
		frequency, bandwidth, spreading_factor, event_topic_template, command_topic_template
	FROM org_configs 
	WHERE org_id = ?;`

	row := db.QueryRow(query, orgID)

	var cfg StartRequest
	var fPort int

	err := row.Scan(
		&cfg.TenantID, &cfg.DeviceCount, &cfg.GatewayCount, &cfg.Duration, &cfg.ActivationTime,
		&cfg.UplinkInterval, &cfg.AppName, &cfg.DevicePrefix, &fPort, &cfg.Payload,
		&cfg.Frequency, &cfg.Bandwidth, &cfg.SpreadingFactor, &cfg.EventTopicTemplate, &cfg.CommandTopicTemplate,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	cfg.FPort = uint8(fPort)
	return &cfg, nil
}

// SaveOrgConfig inserts or updates simulation config for a given organization ID.
func SaveOrgConfig(orgID string, cfg *StartRequest) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	query := `
	INSERT INTO org_configs (
		org_id, tenant_id, device_count, gateway_count, duration, activation_time, 
		uplink_interval, app_name, device_prefix, f_port, payload, 
		frequency, bandwidth, spreading_factor, event_topic_template, command_topic_template, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
		frequency = excluded.frequency,
		bandwidth = excluded.bandwidth,
		spreading_factor = excluded.spreading_factor,
		event_topic_template = excluded.event_topic_template,
		command_topic_template = excluded.command_topic_template,
		updated_at = excluded.updated_at;`

	_, err := db.Exec(
		query,
		orgID, cfg.TenantID, cfg.DeviceCount, cfg.GatewayCount, cfg.Duration, cfg.ActivationTime,
		cfg.UplinkInterval, cfg.AppName, cfg.DevicePrefix, int(cfg.FPort), cfg.Payload,
		cfg.Frequency, cfg.Bandwidth, cfg.SpreadingFactor, cfg.EventTopicTemplate, cfg.CommandTopicTemplate,
		time.Now(),
	)
	return err
}
