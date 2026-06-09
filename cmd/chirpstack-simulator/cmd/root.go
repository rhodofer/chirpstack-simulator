package cmd

import (
	"bytes"
	"io/ioutil"

	"github.com/brocaar/chirpstack-simulator/internal/config"
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var cfgFile string
var version string

// Execute executes the root command.
func Execute(v string) {
	version = v
	if err := rootCmd.Execute(); err != nil {
		log.Fatal(err)
	}
}

var rootCmd = &cobra.Command{
	Use:   "chirpstack-simulator",
	Short: "ChirpStack Simulator",
	Long: `ChirpStack Simulator simulates device uplinks
	> documentation & support: https://www.chirpstack.io/
	> source & copyright information: https://github.com/brocaar/chirpstack-simulator/`,
	RunE: run,
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVarP(&cfgFile, "config", "c", "", "path to configuration file (optional)")
	rootCmd.PersistentFlags().Int("log-level", 4, "debug=5, info=4, error=2, fatal=1, panic=0")

	viper.BindPFlag("general.log_level", rootCmd.PersistentFlags().Lookup("log-level"))

	viper.SetDefault("chirpstack.api.server", "127.0.0.1:8080")
	viper.SetDefault("chirpstack.integration.mqtt.server", "tcp://127.0.0.1:1883")
	viper.SetDefault("chirpstack.gateway.backend.mqtt.server", "tcp://127.0.0.1:1883")
	viper.SetDefault("prometheus.bind", "0.0.0.0:9001")
	viper.SetDefault("http.bind", "0.0.0.0:9002")

	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(configCmd)
}

func initConfig() {
	config.Version = version
	config.CfgFile = cfgFile

	if cfgFile != "" {
		b, err := ioutil.ReadFile(cfgFile)
		if err != nil {
			log.WithError(err).WithField("config", cfgFile).Fatal("error loading config file")
		}
		viper.SetConfigType("toml")
		if err := viper.ReadConfig(bytes.NewBuffer(b)); err != nil {
			log.WithError(err).WithField("config", cfgFile).Fatal("error loading config file")
		}
	} else {
		viper.SetConfigName("chirpstack-simulator")
		viper.AddConfigPath(".")
		viper.AddConfigPath("$HOME/.config/chirpstack-simulator")
		viper.AddConfigPath("/etc/chirpstack-simulator")
		
		// Also try simulator.toml which is used locally
		if err := viper.ReadInConfig(); err != nil {
			viper.SetConfigName("simulator")
			if err2 := viper.ReadInConfig(); err2 != nil {
				switch err2.(type) {
				case viper.ConfigFileNotFoundError:
				default:
					log.WithError(err2).Fatal("read configuration file error")
				}
			}
		}
	}

	if err := viper.Unmarshal(&config.C); err != nil {
		log.WithError(err).Fatal("unmarshal config error")
	}
}
