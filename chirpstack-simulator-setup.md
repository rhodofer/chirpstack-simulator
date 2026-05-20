# ChirpStack Simulator Setup Plan

## 1. ANALYSIS
- **Goal**: Set up `chirpstack-simulator` as a standalone terminal utility in the current directory to generate simulated sensor traffic (Temperature, Pressure, Voltage).
- **Target Server**: `http://api-chirpstack.iofeteknoloji.com/` (ChirpStack v4)
- **Data Format**: A payload representing Temperature, Pressure, and Voltage. We will define a static HEX payload or a custom encoder depending on capabilities.

## 2. PLANNING
1. **Clone the Repository**: Clone `brocaar/chirpstack-simulator` to the current directory.
2. **Build**: Use `docker-compose run --rm chirpstack-simulator make clean build` to compile the Go binary for Windows/Linux.
3. **Configuration**: Create a `simulator.toml` file with:
   - Provided API URL and API Key.
   - Remote MQTT broker details.
   - Target Tenant ID.
   - Simulated device profile and HEX payload (e.g., `001903F521` for 25°C, 1013hPa, 3.3V).
4. **Execution**: Run the compiled binary pointing to the `simulator.toml`.

## 3. SOLUTIONING & EDGE CASES
- The official simulator uses a **static HEX payload** in its config (e.g., `payload="010203"`). It sends this same payload on every uplink. To decode it as Temp/Pressure/Voltage, we will configure a custom JS Codec in the Falt/ChirpStack Device Profile to parse this static HEX into JSON variables.
- **MQTT Access**: Simulating a gateway requires publishing directly to the remote MQTT broker of ChirpStack. We must ensure MQTT is exposed remotely.
- **Tenant ID**: Required to create applications and devices in ChirpStack.

## 4. IMPLEMENTATION
*Pending Edge Case Confirmation*
