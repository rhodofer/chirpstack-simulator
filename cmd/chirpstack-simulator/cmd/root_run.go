package cmd

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/pkg/errors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"

	"github.com/brocaar/chirpstack-simulator/internal/api"
	"github.com/brocaar/chirpstack-simulator/internal/as"
	"github.com/brocaar/chirpstack-simulator/internal/config"
	"github.com/brocaar/chirpstack-simulator/internal/ns"
	"github.com/brocaar/chirpstack-simulator/internal/simulator"
)

// task represents a named initialization task with a fatal flag.
// If fatal is true, a failure kills the process.
type task struct {
	name  string
	fn    func(context.Context, *sync.WaitGroup) error
	fatal bool
}

func run(cnd *cobra.Command, args []string) error {
	tasks := []task{
		{name: "setLogLevel", fn: setLogLevel, fatal: true},
		{name: "printStartMessage", fn: printStartMessage, fatal: true},
		{name: "setupHTTP", fn: setupHTTP, fatal: true},
		{name: "setupPrometheus", fn: setupPrometheus, fatal: true},
		// ChirpStack-dependent tasks — non-fatal so HTTP/UI still works.
		{name: "setupASAPIClient", fn: setupASAPIClient, fatal: false},
		{name: "setupASIntegration", fn: setupASIntegration, fatal: false},
		{name: "setupNSIntegration", fn: setupNSIntegration, fatal: false},
	}

	var wg sync.WaitGroup
	ctx, cancel := context.WithCancel(context.Background())

	for _, t := range tasks {
		if err := t.fn(ctx, &wg); err != nil {
			if t.fatal {
				log.WithField("task", t.name).Fatal(err)
			} else {
				log.WithFields(log.Fields{
					"task":  t.name,
					"error": err,
				}).Warn("non-critical task failed, continuing without it")
			}
		}
	}

	exitChan := make(chan struct{})
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan
	go func() {
		cancel()
		wg.Wait()
		exitChan <- struct{}{}
	}()
	cancel()
	select {
	case <-exitChan:
	case s := <-sigChan:
		log.WithField("signal", s).Info("signal received, terminating")
	}

	return nil
}

func setLogLevel(ctx context.Context, wg *sync.WaitGroup) error {
	log.SetLevel(log.Level(uint8(config.C.General.LogLevel)))
	return nil
}

func printStartMessage(ctx context.Context, wg *sync.WaitGroup) error {
	log.WithFields(log.Fields{
		"version": version,
		"docs":    "https://www.chirpstack.io/",
	}).Info("starting ChirpStack Simulator")
	return nil
}

func setupASAPIClient(ctx context.Context, wg *sync.WaitGroup) error {
	if err := as.Setup(config.C); err != nil {
		log.WithError(err).Warn("as: initial ChirpStack API connection failed, starting reconnect loop in background")
		go func() {
			ticker := time.NewTicker(5 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					log.Info("as: attempting to reconnect to ChirpStack API...")
					if retryErr := as.Setup(config.C); retryErr == nil {
						log.Info("as: ChirpStack API connection established successfully!")
						as.StartPoller(ctx)
						return
					} else {
						log.WithError(retryErr).Warn("as: ChirpStack API reconnect attempt failed")
					}
				}
			}
		}()
		return nil
	}
	// Start gRPC-based poller to surface ChirpStack events in the console.
	as.StartPoller(ctx)
	return nil
}

func setupASIntegration(ctx context.Context, wg *sync.WaitGroup) error {
	return nil
}

func setupNSIntegration(ctx context.Context, wg *sync.WaitGroup) error {
	if err := ns.Setup(config.C); err != nil {
		log.WithError(err).Warn("ns: initial MQTT connection failed, starting reconnect loop in background")
		go func() {
			ticker := time.NewTicker(5 * time.Second)
			defer ticker.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					log.Info("ns: attempting to reconnect to MQTT broker...")
					if retryErr := ns.Setup(config.C); retryErr == nil {
						log.Info("ns: MQTT broker connection established successfully!")
						return
					} else {
						log.WithError(retryErr).Warn("ns: MQTT reconnect attempt failed")
					}
				}
			}
		}()
		return nil
	}
	return nil
}

func setupPrometheus(ctx context.Context, wg *sync.WaitGroup) error {
	log.WithFields(log.Fields{
		"bind": config.C.Prometheus.Bind,
	}).Info("starting Prometheus endpoint server")

	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())

	server := http.Server{
		Handler: mux,
		Addr:    config.C.Prometheus.Bind,
	}

	go func() {
		err := server.ListenAndServe()
		log.WithError(err).Error("prometheus endpoint server error")
	}()

	return nil
}

func setupHTTP(ctx context.Context, wg *sync.WaitGroup) error {
	log.WithFields(log.Fields{
		"bind": config.C.HTTP.Bind,
	}).Info("starting HTTP API server")

	srv := api.New(config.C.HTTP.Bind)

	go func() {
		if err := srv.Start(); err != nil && err != http.ErrServerClosed {
			log.WithError(err).Error("HTTP API server error")
		}
	}()

	// Graceful shutdown on context cancellation.
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Stop(shutdownCtx); err != nil {
			log.WithError(err).Error("HTTP API server shutdown error")
		}
	}()

	return nil
}

func startSimulator(ctx context.Context, wg *sync.WaitGroup) error {
	// Skip if ChirpStack API is not connected — simulator needs it.
	if !as.IsConnected() {
		return errors.New("ChirpStack API not connected, skipping simulator start")
	}

	if err := simulator.Start(ctx, wg, config.C); err != nil {
		return errors.Wrap(err, "start simulator error")
	}

	return nil
}
