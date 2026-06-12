package api

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"os"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"

	"github.com/brocaar/chirpstack-simulator/internal/config"
	sim_pkg "github.com/brocaar/chirpstack-simulator/simulator"
)

var (
	ServerStartTime      = time.Now()
	reportSchedulerMutex sync.Mutex
	reportSchedulerStarted = false
)

// StartReportScheduler initializes the background reporting loop.
func StartReportScheduler() {
	reportSchedulerMutex.Lock()
	defer reportSchedulerMutex.Unlock()

	if reportSchedulerStarted {
		return
	}
	reportSchedulerStarted = true

	log.Info("smtp: starting daily health report scheduler")
	go func() {
		// Run a check every 10 minutes
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()

		// Run immediately on start
		checkAndSendReport()

		for range ticker.C {
			checkAndSendReport()
		}
	}()
}

func checkAndSendReport() {
	if !config.C.SMTP.Enabled {
		return
	}

	today := time.Now().Format("2006-01-02")
	lastSent, err := GetSystemState("last_report_sent_date")
	if err != nil {
		log.WithError(err).Error("smtp: failed to query last sent report date")
		return
	}

	if lastSent == today {
		return
	}

	log.WithField("date", today).Info("smtp: initiating daily health report delivery")
	go sendEmailWithRetry(today)
}

func sendEmailWithRetry(today string) {
	// Attempt daily report send
	err := SendEmailReport(false)
	if err == nil {
		if dbErr := SaveSystemState("last_report_sent_date", today); dbErr != nil {
			log.WithError(dbErr).Error("smtp: failed to save last sent report date to database")
		}
		return
	}

	log.WithError(err).Warn("smtp: failed to send daily email report, starting retries")

	// Retry up to 3 times, spaced 30 minutes apart
	for i := 1; i <= 3; i++ {
		time.Sleep(30 * time.Minute)
		log.WithFields(log.Fields{
			"attempt": i,
			"date":    today,
		}).Info("smtp: retrying email report delivery")

		err = SendEmailReport(false)
		if err == nil {
			log.Info("smtp: daily report sent successfully on retry")
			if dbErr := SaveSystemState("last_report_sent_date", today); dbErr != nil {
				log.WithError(dbErr).Error("smtp: failed to save last sent report date on retry")
			}
			return
		}
		log.WithError(err).Warnf("smtp: retry attempt %d failed", i)
	}

	log.Error("smtp: failed to send daily email report after all retries")
}

// SendEmailReport compiles system health metrics and delivers the SMTP mail.
func SendEmailReport(isTest bool) error {
	smtpConf := config.C.SMTP
	if !smtpConf.Enabled && !isTest {
		return fmt.Errorf("smtp is disabled in configuration")
	}

	metrics, err := collectMetrics()
	if err != nil {
		return fmt.Errorf("failed to collect system metrics: %w", err)
	}

	subject := "ChirpStack Simülatörü Günlük Sağlık Raporu"
	if isTest {
		subject = "ChirpStack Simülatörü SMTP Bağlantı Testi [BAŞARILI]"
	}

	body := buildHTMLReport(metrics)
	
	err = sendEmail(
		smtpConf.Host,
		smtpConf.Port,
		smtpConf.Encryption,
		smtpConf.Username,
		smtpConf.Password,
		smtpConf.FromEmail,
		smtpConf.ReportEmail,
		subject,
		body,
	)
	if err != nil {
		return err
	}

	if isTest {
		log.Info("smtp: connection test email delivered successfully")
	} else {
		log.Info("smtp: daily report email delivered successfully")
	}

	return nil
}

func collectMetrics() (map[string]interface{}, error) {
	metrics := make(map[string]interface{})
	state := GetState()

	// Simulation Status & Uptime
	state.mu.Lock()
	metrics["status"] = string(state.Status)
	if state.Status == StatusRunning || state.Status == StatusStopping {
		uptimeSec := (time.Now().UnixMilli() - state.StartedAt) / 1000
		metrics["uptime"] = formatDuration(time.Duration(uptimeSec) * time.Second)
	} else {
		metrics["uptime"] = formatDuration(time.Since(ServerStartTime))
	}
	state.mu.Unlock()

	// Database Info
	dbSize := "0 KB"
	if fileInfo, err := os.Stat("simulator.db"); err == nil {
		sizeMB := float64(fileInfo.Size()) / (1024 * 1024)
		if sizeMB >= 0.1 {
			dbSize = fmt.Sprintf("%.2f MB", sizeMB)
		} else {
			dbSize = fmt.Sprintf("%.2f KB", float64(fileInfo.Size())/1024)
		}
	}
	metrics["db_size"] = dbSize

	// Report Days Count
	reportDays := "0"
	if db != nil {
		var count int
		_ = db.QueryRow("SELECT COUNT(*) FROM system_states WHERE key LIKE 'last_report_sent_date%'").Scan(&count)
		reportDays = fmt.Sprintf("%d", count)
	}
	metrics["report_days_count"] = reportDays

	// Simulation Telemetry Counters
	metrics["device_uplinks"] = int(getCounterVecSum(sim_pkg.DeviceUplinkCounterVec()))
	metrics["device_join_requests"] = int(getCounterVecSum(sim_pkg.DeviceJoinRequestCounterVec()))
	metrics["device_join_accepts"] = int(getCounterVecSum(sim_pkg.DeviceJoinAcceptCounterVec()))
	metrics["gateway_uplinks"] = int(getCounterVecSum(sim_pkg.GatewayUplinkCounterVec()))
	metrics["gateway_downlinks"] = int(getCounterVecSum(sim_pkg.GatewayDownlinkCounterVec()))

	// Organization Configs
	configs, err := GetActiveOrgConfigs()
	if err != nil {
		configs = []StartRequest{}
	}
	metrics["org_configs"] = configs

	return metrics, nil
}

func formatDuration(d time.Duration) string {
	d = d.Round(time.Second)
	h := d / time.Hour
	d -= h * time.Hour
	m := d / time.Minute
	d -= m * time.Minute
	s := d / time.Second
	return fmt.Sprintf("%02d saat %02d dakika %02d saniye", h, m, s)
}

func connectSMTP(host string, port int, encryption string, username, password string) (*smtp.Client, error) {
	addr := fmt.Sprintf("%s:%d", host, port)
	var c *smtp.Client
	var err error

	tlsConfig := &tls.Config{
		ServerName: host,
	}

	if encryption == "ssl" {
		// Implicit SSL/TLS connection (usually port 465)
		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			return nil, fmt.Errorf("tls dial error: %w", err)
		}
		c, err = smtp.NewClient(conn, host)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("smtp new client error: %w", err)
		}
	} else {
		// Plain or STARTTLS connection (usually port 587 or 25)
		conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
		if err != nil {
			return nil, fmt.Errorf("tcp dial error: %w", err)
		}
		c, err = smtp.NewClient(conn, host)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("smtp new client error: %w", err)
		}

		if encryption == "tls" {
			if err = c.StartTLS(tlsConfig); err != nil {
				c.Close()
				return nil, fmt.Errorf("starttls error: %w", err)
			}
		}
	}

	// Authenticate if credentials are provided
	if username != "" && password != "" {
		auth := smtp.PlainAuth("", username, password, host)
		if err = c.Auth(auth); err != nil {
			c.Close()
			return nil, fmt.Errorf("smtp authentication error: %w", err)
		}
	}

	return c, nil
}

func sendEmail(host string, port int, encryption string, username, password string, from string, to string, subject string, body string) error {
	client, err := connectSMTP(host, port, encryption, username, password)
	if err != nil {
		return err
	}
	defer client.Quit()

	if err = client.Mail(from); err != nil {
		return fmt.Errorf("smtp mail command error: %w", err)
	}
	if err = client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt command error: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data command error: %w", err)
	}

	header := make(map[string]string)
	header["From"] = from
	header["To"] = to
	header["Subject"] = subject
	header["MIME-Version"] = "1.0"
	header["Content-Type"] = "text/html; charset=\"utf-8\""

	msg := ""
	for k, v := range header {
		msg += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	msg += "\r\n" + body

	if _, err = w.Write([]byte(msg)); err != nil {
		w.Close()
		return fmt.Errorf("write smtp body error: %w", err)
	}
	w.Close()

	return nil
}

func buildHTMLReport(metrics map[string]interface{}) string {
	html := `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ChirpStack Simulator Sistem Sağlığı Raporu</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: #0f172a;
    color: #f8fafc;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 600px;
    margin: 40px auto;
    background-color: #1e293b;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
    border: 1px solid #334155;
  }
  .header {
    background: linear-gradient(135deg, #3b82f6 0%%, #1d4ed8 100%%);
    padding: 30px 40px;
    text-align: center;
  }
  .header h1 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
  }
  .header p {
    margin: 8px 0 0 0;
    color: #93c5fd;
    font-size: 14px;
  }
  .content {
    padding: 40px;
  }
  .section-title {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
    margin-bottom: 16px;
    border-bottom: 1px solid #334155;
    padding-bottom: 8px;
    font-weight: 600;
  }
  .grid {
    display: table;
    width: 100%%;
    margin-bottom: 30px;
  }
  .grid-row {
    display: table-row;
  }
  .grid-col {
    display: table-cell;
    width: 50%%;
    padding: 10px;
    box-sizing: border-box;
  }
  .card {
    background-color: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }
  .card-label {
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  .card-value {
    font-size: 20px;
    font-weight: 700;
    color: #3b82f6;
  }
  .table {
    width: 100%%;
    border-collapse: collapse;
    margin-bottom: 30px;
  }
  .table th, .table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #334155;
  }
  .table th {
    background-color: #0f172a;
    color: #94a3b8;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }
  .table td {
    font-size: 14px;
    color: #e2e8f0;
  }
  .status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .status-running {
    background-color: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  .status-idle {
    background-color: rgba(148, 163, 184, 0.2);
    color: #94a3b8;
    border: 1px solid rgba(148, 163, 184, 0.3);
  }
  .footer {
    background-color: #0f172a;
    padding: 20px 40px;
    text-align: center;
    border-top: 1px solid #334155;
    font-size: 12px;
    color: #64748b;
  }
  .footer p {
    margin: 4px 0;
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>ChirpStack Simülatör Sağlık Raporu</h1>
    <p>Sistem Durumu ve Çalışma İstatistikleri</p>
  </div>
  <div class="content">
    <div class="section-title">Sistem Durumu</div>
    <table class="table">
      <tr>
        <td>Simülatör Durumu</td>
        <td>
          <span class="status-badge %s">%s</span>
        </td>
      </tr>
      <tr>
        <td>Uptime (Çalışma Süresi)</td>
        <td>%s</td>
      </tr>
      <tr>
        <td>Veritabanı Boyutu</td>
        <td>%s</td>
      </tr>
      <tr>
        <td>Gönderilen Toplam Rapor Günü</td>
        <td>%s</td>
      </tr>
    </table>

    <div class="section-title">Simülasyon Metrikleri (Son 24 Saat)</div>
    <div class="grid">
      <div class="grid-row">
        <div class="grid-col">
          <div class="card">
            <div class="card-label">Toplam Cihaz Uplink</div>
            <div class="card-value">%d</div>
          </div>
        </div>
        <div class="grid-col">
          <div class="card">
            <div class="card-label">Toplam Gateway Uplink</div>
            <div class="card-value">%d</div>
          </div>
        </div>
      </div>
      <div class="grid-row">
        <div class="grid-col">
          <div class="card">
            <div class="card-label">Join İstekleri (Request)</div>
            <div class="card-value">%d</div>
          </div>
        </div>
        <div class="grid-col">
          <div class="card">
            <div class="card-label">Kabul Edilen Join (Accept)</div>
            <div class="card-value">%d</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-title">Konfigüre Edilen Kaynaklar</div>
    <table class="table">
      <thead>
        <tr>
          <th>Organizasyon ID</th>
          <th>Cihaz Sayısı</th>
          <th>Gateway Sayısı</th>
        </tr>
      </thead>
      <tbody>
        %s
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>Bu e-posta ChirpStack Simülatörü tarafından otomatik olarak üretilmiştir.</p>
    <p>Sunucu Tarihi: %s</p>
  </div>
</div>
</body>
</html>`

	statusClass := "status-idle"
	statusStr := "BOŞTA (IDLE)"
	if metrics["status"].(string) == "running" {
		statusClass = "status-running"
		statusStr = "ÇALIŞIYOR (RUNNING)"
	}

	orgRows := ""
	configs := metrics["org_configs"].([]StartRequest)
	if len(configs) == 0 {
		orgRows = "<tr><td colspan='3' style='text-align:center; color:#64748b;'>Konfigüre edilmiş organizasyon bulunmamaktadır.</td></tr>"
	} else {
		for _, cfg := range configs {
			orgRows += fmt.Sprintf("<tr><td>%s</td><td>%d</td><td>%d</td></tr>", cfg.TenantID, cfg.DeviceCount, cfg.GatewayCount)
		}
	}

	return fmt.Sprintf(html,
		statusClass, statusStr,
		metrics["uptime"].(string),
		metrics["db_size"].(string),
		metrics["report_days_count"].(string),
		metrics["device_uplinks"].(int),
		metrics["gateway_uplinks"].(int),
		metrics["device_join_requests"].(int),
		metrics["device_join_accepts"].(int),
		orgRows,
		time.Now().Format("02.01.2006 15:04:05"),
	)
}
