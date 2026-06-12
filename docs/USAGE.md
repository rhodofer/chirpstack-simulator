# ChirpStack Simulator — Kullanım Kılavuzu

## İçindekiler

1. [Giriş](#1-giriş)
2. [Kurulum](#2-kurulum)
3. [Yapılandırma](#3-yapılandırma)
4. [Temel Kullanım: Simülasyon](#4-temel-kullanım-simülasyon)
5. [Provisioning CLI](#5-provisioning-cli)
6. [Çıkış Davranışı (CTRL+C)](#6-çıkış-davranışı-ctrlc)
7. [Raporlama](#7-raporlama)
8. [Güvenlik ve Sınırlamalar](#8-güvenlik-ve-sınırlamalar)
9. [Sık Sorulan Sorular](#9-sık-sorulan-sorular)
10. [Shell Entegrasyonu (Windows)](#10-shell-entegrasyonu-windows)
11. [Web UI (Arayüz) Kullanımı](#11-web-ui-arayüz-kullanımı)
12. [Ek: Hızlı Başlangıç](#12-ek-hızlı-başlangıç)

---

## 1. Giriş

**ChirpStack Simulator**, [ChirpStack](https://www.chirpstack.io/) v4 LoRaWAN Network Server üzerinde simüle edilmiş cihaz ve ağ geçidi trafiği oluşturmak için geliştirilmiş bir açık kaynak aracıdır.

### Özellikler

- **Simülasyon:** Yüzlerce sanal cihazın uplink göndermesini simüle eder
- **Provisioning:** ChirpStack tenant'ına idempotent olarak application, device, device-profile ekleme/silme/listeleme
- **Mock İsimler:** Application ve device'lar için üç kelimeli anlamlı isimler üretir
- **Raporlama:** Her provisioning çalışması JSON rapor + konsol özeti + p50/p95/p99 latans hesaplar
- **Dry-Run:** `--dry-run` ile hiçbir yazma yapmadan adımları görüntüleme
- **Uplink Görünürlüğü:** OTAA join request ve uplink verileri terminalde canlı görüntülenir

### Mimarî Bakış

```
Kullanıcı
  │
  ├── chirpstack-simulator -c config.toml        → Simülasyon başlat
  ├── chirpstack-simulator add application 5      → Provisioning (CLI)
  ├── chirpstack-simulator delete applications all --yes  → Temizlik
  └── chirpstack-simulator list applications      → Salt okunur sorgulama
        │
        ▼
┌─────────────────────────────────────────────┐
│  gRPC (JWT) → ChirpStack v4 API              │
│  MQTT      → Gateway / Uplink trafiği        │
└─────────────────────────────────────────────┘
```

---

## 2. Kurulum

### 2.1. Docker ile Derleme (Önerilen)

#### Linux/macOS

```bash
docker-compose run --rm chirpstack-simulator make clean build
```

#### Windows (Yerel Go Yoksa)

```bash
docker run --rm `
  -v "c:\Projects\falt-workspace\chirpstack-simulator":/app `
  -w /app `
  golang:1.22-alpine `
  sh -c "CGO_ENABLED=0 go build -o /app/build/chirpstack-simulator cmd/chirpstack-simulator/main.go"
```

Binary: `build/chirpstack-simulator`

### 2.2. Go ile Doğrudan Derleme

```bash
make clean build
# veya
CGO_ENABLED=0 go build -o build/chirpstack-simulator cmd/chirpstack-simulator/main.go
```

### 2.3. Doğrulama

```bash
./build/chirpstack-simulator version
```

---

## 3. Yapılandırma

### 3.1. Şablon Oluşturma

```bash
./build/chirpstack-simulator configfile > chirpstack-simulator.toml
```

### 3.2. Konfigürasyon Alanları

```toml
[general]
log_level = 4           # 5=debug, 4=info, 3=warning, 2=error
min_devices_per_app = 3
max_devices_per_app = 10
report_path = "./simulation_report.json"
cleanup_gateways_on_exit = false

[chirpstack.api]
api_key = "PUT_YOUR_API_KEY_HERE"
server = "192.168.1.103:8080"   # ChirpStack gRPC adresi
insecure = true

[chirpstack.integration.mqtt]
server = "tcp://192.168.1.103:1883"
username = ""
password = ""

[chirpstack.gateway.backend.mqtt]
server = "tcp://192.168.1.103:1883"
username = ""
password = ""

[[simulator]]
tenant_id = "PUT_YOUR_TENANT_ID_HERE"
duration = "5m"
activation_time = "1m"

  [simulator.device]
  count = 1000
  uplink_interval = "5m"
  f_port = 10
  payload = "010203"
  frequency = 868100000
  bandwidth = 125000
  spreading_factor = 7

  [simulator.gateway]
  min_count = 3
  max_count = 5
  event_topic_template = "eu868/gateway/{{ .GatewayID }}/event/{{ .Event }}"
  command_topic_template = "eu868/gateway/{{ .GatewayID }}/command/{{ .Command }}"
```

---

## 4. Temel Kullanım: Simülasyon

### 4.1. Basit Simülasyon Başlatma

```bash
./build/chirpstack-simulator -c chirpstack-simulator.toml
```

### 4.2. Provisioning + Simülasyon (--apps N)

```bash
./build/chirpstack-simulator -c chirpstack-simulator.toml --apps 5
```

### 4.3. Dry-Run

```bash
./build/chirpstack-simulator -c chirpstack-simulator.toml --apps 5 --dry-run
```

---

## 5. Provisioning CLI

### 5.1. `add` — Kaynak Ekleme

```bash
# N adet application oluştur
./build/chirpstack-simulator -c config.toml add application 5

# Dry-run
./build/chirpstack-simulator -c config.toml add application 5 --dry-run

# Application'a device ekle
./build/chirpstack-simulator -c config.toml add device application 1 3
```

### 5.2. `delete` — Kaynak Silme

> **ÖNEMLİ:** Toplu silmede `--yes` ZORUNLUDUR.

```bash
# Tüm application'ları sil
./build/chirpstack-simulator -c config.toml delete applications all --yes

# Dry-run
./build/chirpstack-simulator -c config.toml delete applications all --yes --dry-run
```

### 5.3. `list` — Kaynak Listeleme

```bash
./build/chirpstack-simulator -c config.toml list applications
./build/chirpstack-simulator -c config.toml list device-profiles
./build/chirpstack-simulator -c config.toml list devices <app-name>
./build/chirpstack-simulator -c config.toml list gateways
```

---

## 6. Çıkış Davranışı (CTRL+C)

1. CTRL+C → Uplink döngüsü durur, gateway/device/application KALIR, rapor yazılır
2. CTRL+C → Hard exit (beklemeden kapat)

Gateway temizleme: `[general] cleanup_gateways_on_exit = true`

---

## 7. Raporlama

### 7.1. Konsol Özeti

```
=== Provisioning Raporu ===
Bitiş süresi      : 4523 ms
Toplam application: 5
Toplam device     : 68
Toplam hata       : 0
```

### 7.2. JSON Raporu

`report_path` ile belirtilen yola yazılır. p50/p95/p99 latans bilgilerini içerir.

---

## 8. Güvenlik ve Sınırlamalar

- API key `config.toml` içinde düz metin saklanır, sürüm kontrolüne eklemeyin
- Maksimum 5 eşzamanlı provisioning işlemi
- Exponential backoff: 1s → 2s → 4s → 8s → max 30s
- Tenant izolasyonu: tüm işlemler config'deki tenant_id ile yapılır

---

## 9. Sık Sorulan Sorular

### "add application 5" ile "--apps 5" arasındaki fark?

| Mod | Ne Yapar? | Simülasyon Başlatır mı? |
|-----|-----------|------------------------|
| `add application 5` | Sadece provisioning | Hayır |
| `--apps 5` | Provisioning + simülasyon | Evet |

### Simülasyon çıktısı görünmüyor?

- `log_level=4` (info) olduğundan emin olun
- Shell modunda `sim` komutu terminalde canlı gösterir
- `joinRequest()` ve `dataUp()` metodları info seviyesinde log üretir

---

## 10. Shell Entegrasyonu (Windows)

[`integ/shell.ps1`](integ/shell.ps1), persistent Docker container kullanarak her komutu ~1sn'de çalıştırır.

### Alt Komutlar

| Komut | Açıklama |
|-------|----------|
| `start` | Persistent container başlat |
| `stop` | Container durdur |
| `sim [süre]` | Simülasyon başlat (CTRL+C ile dur) |
| `stop-sim` | Arka plandaki simülasyonu durdur |
| `list/add/delete` | Normal provisioning komutları |

### Kullanım

```powershell
.\integ\shell.ps1 start
.\integ\shell.ps1 list device-profiles    # ~1sn
.\integ\shell.ps1 add application 2
.\integ\shell.ps1 sim 30                  # 30sn simülasyon, çıktı terminalde
.\integ\shell.ps1 stop
```

### Uplink Görünürlüğü

`sim` komutu terminalde canlı gösterir:

```
level=info msg="simulator: send OTAA request" dev_eui=ccf35effc5a1d8e6
level=info msg="simulator: uplink frame sent" dev_eui=ccf35effc5a1d8e6 gateways=2 length=23 payload=00000000...
level=info msg="simulator: send uplink" dev_eui=ccf35effc5a1d8e6 f_cnt=1 f_port=10 payload=010203 confirmed=false
```

---

## 11. Web UI (Arayüz) Kullanımı

ChirpStack Simulator, simülasyonları izlemek ve yönetmek için modern bir web arayüzü (Web UI) sunar.

### 11.1. Web Sunucusunu Başlatma
Web arayüzü varsayılan olarak **`9002`** portundan yayın yapar. Konfigürasyon dosyasındaki (`simulator.toml`) `[http] bind` seçeneği ile bu port değiştirilebilir:

```toml
[http]
bind="0.0.0.0:9002"
```

Simülatör çalıştırıldığında web sunucusu otomatik olarak aktif olur:
- Tarayıcınızdan şu adrese erişebilirsiniz: `http://localhost:9002`

### 11.2. Önemli Özellikler ve Sekmeler

1. **Dashboard (Gösterge Paneli):**
   - Canlı Leaflet harita entegrasyonu ile cihazların konumları ve durumları (çevrimiçi/çevrimdışı/veri gönderen) haritada izlenir.
   - Grafik paneli üzerinden simülasyon metrikleri (uplink, join, başarı oranları) anlık çizilir.
   
2. **Organizasyon Yönetimi:**
   - Her organizasyon bazında simülasyon parametreleri (Cihaz Sayısı, Gateway Sayısı, Cihaz Öneki, Transform Betiği, Paket Kaybı vb.) sunucu SQLite veritabanında (`simulator.db`) kalıcı saklanır.
   - Simülasyon aktifken verilerin bozulmaması için giriş alanları kilitlenir.

3. **Log Merkezi (Log Center):**
   - **Sistem Olayları:** Tarayıcı tarafındaki tüm operasyonel loglar yerel **IndexedDB** (`SimLogDB`) üzerinde saklanır.
   - **Otomatik Rotasyon:** Disk doluluğunu önlemek için her Pazartesi 00:00'da eski loglar boot esnasında otomatik silinir.
   - **Hata Teşhis Paneli (Diagnostics):** Başarısız olan API isteklerinin tüm detayları (metot, yol, status ve yanıt gövdeleri) collapsible bölmede görüntülenebilir.
   - **Canlı Konsol:** Go backend'inden akan SSE logları anlık takip edilebilir, kaynak bazlı filtrelenebilir.

---

## 12. Ek: Hızlı Başlangıç

```bash
# 1. Konfigürasyon şablonu
./build/chirpstack-simulator configfile > chirpstack-simulator.toml

# 2. API key ve tenant ID gir

# 3. Durumu kontrol et
./build/chirpstack-simulator -c config.toml list device-profiles
./build/chirpstack-simulator -c config.toml list applications

# 4. Dry-run
./build/chirpstack-simulator -c config.toml add application 2 --dry-run

# 5. Gerçekten oluştur
./build/chirpstack-simulator -c config.toml add application 2

# 6. Simülasyon başlat
./build/chirpstack-simulator -c config.toml
```
