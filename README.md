.\build\chirpstack-simulator.exe --config simulator.toml

bunu yazarak çalıştırıyoruz


# ChirpStack Simulator

ChirpStack Simulator is an open-source simulator for the [ChirpStack](https://www.chirpstack.io)
open-source LoRaWAN<sup>&reg;</sup> Network-Server (v4). It simulates
a configurable number of devices and gateways, which will be automatically
created on starting the simulation.

This project has been developed together with [TWTG](https://www.twtg.io/).

## Building

The recommended way to compile the simulator code is using [Docker Compose](https://docs.docker.com/compose/).
Example:

```bash
docker-compose run --rm chirpstack-simulator make clean build
```

The binary will be located under `build/chirpstack-simulator`.

## Configuration

For generating a configuration template, use the following command:

```bash
./build/chirpstack-simulator configfile > chirpstack-simulator.toml
```

### Example

```toml
[general]
# Log level
#
# debug=5, info=4, warning=3, error=2, fatal=1, panic=0
log_level=4


# ChirpStack configuration.
[chirpstack]

  # API configuration.
  #
  # This configuration is used to automatically create the:
  #   * Device profile
  #   * Gateways
  #   * Application
  #   * Devices
  [chirpstack.api]

  # JWT token.
  #
  # API key to connect to the ChirpStack API. This API key can created within
  # the ChirpStack web-interface.
  api_key="PUT_YOUR_API_KEY_HERE"

  # Server.
  #
  # This must point to the API interface of ChirpStack.
  # If the server is running on the same machine, keep this to the
  # default value.
  server="127.0.0.1:8080"

  # Insecure.
  #
  # Set this to true when the endpoint is not using TLS.
  insecure=true


  # MQTT integration configuration.
  #
  # This integration is used for counting the number of uplinks that are
  # published by the ChirpStack MQTT integration.
  [chirpstack.integration.mqtt]

  # MQTT server.
  server="tcp://127.0.0.1:1883"

  # Username.
  username=""

  # Password.
  password=""


  # MQTT gateway backend.
  [chirpstack.gateway.backend.mqtt]

  # MQTT server.
  server="tcp://127.0.0.1:1883"

  # Username.
  username=""

  # Password.
  password=""


# Simulator configuration.
[[simulator]]

# Tenant ID.
#
# It is recommended to create a new tenant for simulations.
tenant_id="PUT_YOUR_TENANT_ID_HERE"

# Duration.
#
# This defines the duration of the simulation. If set to '0s', the simulation
# will run until terminated.
duration="5m"

# Activation time.
#
# This is the time that the simulator takes to activate the devices. This
# value must be less than the simulator duration.
activation_time="1m"

  # Device configuration.
  [simulator.device]

  # Number of devices to simulate.
  count=1000

  # Uplink interval.
  uplink_interval="5m"

  # FPort.
  f_port=10

  # Payload (HEX encoded).
  payload="010203"

  # Frequency (Hz).
  frequency=868100000

  # Bandwidth (Hz).
  bandwidth=125000

  # Spreading-factor.
  spreading_factor=7

  # Gateway configuration.
  [simulator.gateway]

  # Min number of receiving gateways.
  min_count=3

  # Max number of receiving gateways.
  max_count=5

  # Event topic template.
  event_topic_template="eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}"

  # Command topic template.
  command_topic_template="eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}"


# Prometheus metrics configuration.
#
# Using Prometheus (and Grafana), it is possible to visualize various
# simulation metrics like:
#   * Join-Requests sent
#   * Join-Accepts received
#   * Uplinks sent (by the devices)
#   * Uplinks sent (by the gateways)
#   * Uplinks sent (by the ChirpStack MQTT integration)
[prometheus]

# IP:port to bind the Prometheus endpoint to.
#
# Metrics can be retrieved from /metrics.
bind="0.0.0.0:9000"
```

## Running the simulator

To start the simulator, execute the following command:

```bash
./build/chirpstack-simulator -c chirpstack-simulator.toml
```

When a duration has been configured, then the simulation will stop after
the given interval. Note that this does not terminate the process! This makes
it possible to still read Prometheus metrics after the simulation has been
completed.

Regardless if a duration has been configured or not, the simulator can be
terminated. When sending an interrupt signal once, the simulation will be
terminated and the simulator will clean up the created gateways, devices,
application and device-profile. When sending an interrupt for the second time,
the simulator will be terminated immediately.

## Prometheus metrics

The ChirpStack Simulator provides various metrics that can be collected using
[Prometheus](https://prometheus.io/) and visualized using [Grafana](https://grafana.com/).

* `device_uplink_count`: The number of uplinks sent by the devices
* `device_join_request_count`: The number of join-requests sent by the devices
* `device_join_accept_count`: The number of join-accepts received by the devices
* `application_uplink_count`: The number of uplinks published by the application integration
* `gateway_uplink_count`: The number of uplinks sent by the gateways
* `gateway_downlink_count`: The number of downlinks received by the gateways

## Integration Tests & Shell (Windows)

This project includes integration test tooling for ChirpStack v4 environments:

- **[`integ/README.md`](integ/README.md)** — Integration test documentation (Türkçe)
- **[`integ/shell.ps1`](integ/shell.ps1)** — Fast command execution (~1s) via persistent container
- **[`integ/simulator-config/integ.toml`](integ/simulator-config/integ.toml)** — Example config targeting `192.168.1.103:8080`

### Quick Start (Windows)

```powershell
# 1. Start persistent shell container
.\integ\shell.ps1 start

# 2. Run commands instantly (~1s each)
.\integ\shell.ps1 list device-profiles
.\integ\shell.ps1 list applications
.\integ\shell.ps1 add application 2

# 3. Run simulation (output visible in terminal)
.\integ\shell.ps1 sim 30

# 4. Clean up
.\integ\shell.ps1 stop-sim
.\integ\shell.ps1 stop
```

### Uplink Visibility

All LoRaWAN traffic logged at `info` level in terminal:

```
level=info msg="simulator: send OTAA request" dev_eui=ccf35effc5a1d8e6
level=info msg="simulator: uplink frame sent" dev_eui=ccf35effc5a1d8e6 gateways=2 length=23 payload=000000...
level=info msg="simulator: send uplink" dev_eui=ccf35effc5a1d8e6 f_cnt=1 f_port=10 payload=010203
```

Full documentation: [`docs/USAGE.md`](docs/USAGE.md) and [`integ/README.md`](integ/README.md)

## Development Notes (Geliştirici Notları)

### 1. Go Path on Windows
Windows terminalinizde `go` komutları tanınmıyorsa, `C:\Program Files\Go\bin` yolunun **PATH** ortam değişkenine eklenmiş olduğundan emin olun.
PowerShell ile kalıcı olarak eklemek için:
```powershell
$pathToAdd = "C:\Program Files\Go\bin"
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -split ';' -notcontains $pathToAdd) {
    [System.Environment]::SetEnvironmentVariable("Path", $userPath + ";" + $pathToAdd, "User")
}
```
*Not: Değişikliğin terminalinizde aktif olması için VS Code veya açık olan terminal kapatılıp açılmalıdır.*

### 2. Web UI Port
Simülatör web arayüzü varsayılan olarak **`9002`** portundan yayın yapar (`simulator.toml` dosyasında `[http] bind` altında ayarlanabilir).
- Web UI: `http://localhost:9002`

### 3. Local Development vs Docker Environment
  Arayüz statik dosyaları (`index.html`, `style.css`, `app.js` dosyaları `internal/api/frontend/` klasörü altındadır) derleme (build) sırasında binary içerisine gömüldüğü (`go:embed` yöntemiyle) için, arayüz değişikliklerinin yansıması için **yeniden derleme (build) yapılması zorunludur.**

  **Önemli Not (Modüler HTML Bileşenleri):** Eğer `internal/api/frontend/src/` dizini altındaki modüler HTML şablonlarında (örn: `sidebar.html`, `tabs/settings.html` vb.) değişiklik yaptıysanız, projeyi derlemeden veya konteyneri yeniden başlatmadan önce bu değişiklikleri `index.html` dosyasına derlemek için yerel makinenizde **Python 3** kullanarak şu komutu çalıştırmalısınız:
  ```powershell
  python internal/api/frontend/build.py
  ```

  - **Docker Compose (Önerilen/Varsayılan):** Simülatörü docker-compose üzerinden çalıştırıyorsanız, yerelde yaptığınız arayüz değişikliklerinin docker imajında aktif olması için docker konteynerini yeniden başlatmanız yeterlidir (konteyner başlarken otomatik derleme yapar):
    ```powershell
    docker-compose restart
    ```
  - **Local Windows Binary (Yerel Çalıştırma):** Simülatörü yerel Windows terminalinizden çalıştırmak istiyorsanız:
    ```powershell
    # Windows exe derleme
    go build -ldflags "-s -w -X main.version=1.0.0" -o build/chirpstack-simulator.exe cmd/chirpstack-simulator/main.go
    
    # Çalıştırma
    .\build\chirpstack-simulator.exe --config simulator.toml
    ```

### 4. Tenant-Scoped Filtering (Tenant Bazlı Filtreleme)
Simülatör API'si global filtreleme ve tenant-scoped veri erişimini destekler:
- **API Davranışı:** `handleListApplications`, `handleListDevices` ve `handleListDeviceProfiles` handler'ları, `tenant_id` parametresi boş (`""`) gönderildiğinde tüm tenant'lar/organizasyonlar arasında arama yaparak birleştirilmiş liste döner.
- **Frontend Sync:** Arayüzde `net-tenant-select` ve `dp-tenant-select` gibi tenant filtreleme seçimleri yapıldığında ilgili API istekleri bu tenant parametresi ile yenilenir.

### 5. Frontend ve Simülatör İyileştirmeleri (Yeni Özellikler)
Geliştirilen modern arayüz ve simülatör altyapısında aşağıdaki özellikler eklenmiştir:
- **Organizasyon Bazlı Konfigürasyon Kalıcılığı:** Her organizasyonun çekmecesindeki simülasyon ayarları (Cihaz Sayısı, Gateway Sayısı, Cihaz Öneki ve tüm çalışma ayarları) tarayıcı yerine sunucudaki **SQLite** veritabanında (`simulator.db`) kalıcı olarak saklanır ve organizasyon seçildiğinde API üzerinden otomatik çekilir.
- **Ayarları Kaydetme ve Doğrulama:** Çekmecede yapılan değişikliklerin geçerli olması için explicit bir **"✓ Ayarları Kaydet"** butonu bulunur. Cihaz/Gateway sayılarının sıfırdan büyük olması ve uygulama adının boş bırakılmaması gibi temel doğrulama adımları barındırır.
- **Simülasyon Esnasında Arayüz Kilitleme (Input Lock):** Simülasyon aktifken (`running` veya `starting` durumunda) hatalı çalışma yapılandırmasını önlemek adına hem çekmecedeki ayarlar hem de genel ayarlar sayfasındaki tüm giriş alanları kilitlenir.
- **Genişletilebilir Canlı Log Konsolu:** Alt panelde yer alan log terminali sürükle-bırak ile dikey olarak yeniden boyutlandırılabilir, daraltılıp genişletilebilir.
- **Detaylı Cihaz ve Uygulama Logları:** Canlı log akışında hangi cihazın (`device_name` ve `dev_eui`) hangi uygulamaya (`app_name`) veri veya OTAA isteği gönderdiği JSON parametreleriyle açıkça listelenir.


## License

ChirpStack Simulator is distributed under the MIT license. See also
[LICENSE](https://github.com/brocaar/chirpstack-simulator/blob/master/LICENSE).
