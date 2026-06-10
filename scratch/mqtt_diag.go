package main

import (
	"fmt"
	"os"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

func main() {
	opts := mqtt.NewClientOptions()
	opts.AddBroker("tcp://192.168.1.103:1883")
	opts.SetCleanSession(true)
	opts.SetAutoReconnect(true)

	opts.SetConnectionLostHandler(func(client mqtt.Client, err error) {
		fmt.Printf("[DIAG] Connection lost: %v\n", err)
	})

	opts.SetOnConnectHandler(func(client mqtt.Client) {
		fmt.Println("[DIAG] Connected successfully")
		
		subToken := client.Subscribe("application/#", 0, func(c mqtt.Client, msg mqtt.Message) {
			fmt.Printf("[DIAG] Topic: %s | Payload: %s\n", msg.Topic(), string(msg.Payload()))
		})
		if subToken.Wait() && subToken.Error() != nil {
			fmt.Printf("[DIAG] Subscribe error: %v\n", subToken.Error())
		} else {
			fmt.Println("[DIAG] Subscribed to application/#")
		}

		subToken2 := client.Subscribe("#", 0, func(c mqtt.Client, msg mqtt.Message) {
			fmt.Printf("[DIAG-ALL] Topic: %s | Payload len: %d\n", msg.Topic(), len(msg.Payload()))
		})
		_ = subToken2.Wait()
	})

	fmt.Println("[DIAG] Connecting to tcp://192.168.1.103:1883...")
	client := mqtt.NewClient(opts)
	if token := client.Connect(); token.Wait() && token.Error() != nil {
		fmt.Printf("[DIAG] Connect error: %v\n", token.Error())
		os.Exit(1)
	}

	// Run for 30 seconds
	time.Sleep(30 * time.Second)
	client.Disconnect(250)
	fmt.Println("[DIAG] Disconnected. Exiting.")
}
