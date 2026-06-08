package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	log "github.com/sirupsen/logrus"
)

// LogHook captures logrus entries and broadcasts them to active SSE clients.
type LogHook struct {
	mu      sync.RWMutex
	clients map[chan string]bool
	buffer  []string
	maxSize int
}

var (
	globalLogHook *LogHook
	logOnce       sync.Once
)

// InitLogHook initializes the log hook and registers it with logrus.
func InitLogHook() {
	logOnce.Do(func() {
		globalLogHook = &LogHook{
			clients: make(map[chan string]bool),
			buffer:  make([]string, 0, 100),
			maxSize: 100,
		}
		log.AddHook(globalLogHook)
	})
}

// Levels returns the log levels that trigger this hook (all levels).
func (h *LogHook) Levels() []log.Level {
	return log.AllLevels
}

// Fire is called by logrus when a log entry is written.
func (h *LogHook) Fire(entry *log.Entry) error {
	timestamp := entry.Time.Format(time.RFC3339)
	levelStr := entry.Level.String()
	msg := entry.Message

	fields := ""
	if len(entry.Data) > 0 {
		fieldsData, err := json.Marshal(entry.Data)
		if err == nil {
			fields = " " + string(fieldsData)
		}
	}
	line := fmt.Sprintf("[%s] %s: %s%s", timestamp, levelStr, msg, fields)

	h.mu.Lock()
	if len(h.buffer) >= h.maxSize {
		h.buffer = h.buffer[1:]
	}
	h.buffer = append(h.buffer, line)

	for client := range h.clients {
		select {
		case client <- line:
		default:
		}
	}
	h.mu.Unlock()

	return nil
}

// handleLogStream streams logrus logs using Server-Sent Events (SSE).
func handleLogStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	clientChan := make(chan string, 50)

	globalLogHook.mu.Lock()
	// Send existing buffered logs to the new client
	for _, line := range globalLogHook.buffer {
		fmt.Fprintf(w, "data: %s\n\n", line)
	}
	globalLogHook.clients[clientChan] = true
	globalLogHook.mu.Unlock()

	flusher.Flush()

	defer func() {
		globalLogHook.mu.Lock()
		delete(globalLogHook.clients, clientChan)
		globalLogHook.mu.Unlock()
		close(clientChan)
	}()

	for {
		select {
		case <-r.Context().Done():
			return
		case line := <-clientChan:
			fmt.Fprintf(w, "data: %s\n\n", line)
			flusher.Flush()
		}
	}
}
