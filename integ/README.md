# Integration Tests

Bu dizin, `chirpstack-simulator`'ü ChirpStack v4 ortamında test etmek için gerekli
Docker altyapısını, konfigürasyon dosyalarını ve otomatik test script'lerini içerir.

## İçindekiler

- [`shell.ps1`](./shell.ps1) — Hızlı shell modu (persistent container, ~1sn yanıt)
- [`simulator-config/`](./simulator-config/) — Simulator test konfigürasyonu
- [`chirpstack-config/`](./chirpstack-config/) — ChirpStack konfigürasyonu

## Hızlı Başlangıç

### 🚀 Shell Modu (Önerilen)

Persistent container kullanır, her komut ~1sn'de çalışır.

```powershell
# Container'ı başlat (bir kere)
.\integ\shell.ps1 start

# Komutları anında çalıştır
.\integ\shell.ps1 list device-profiles
.\integ\shell.ps1 list applications
.\integ\shell.ps1 add application 2
.\integ\shell.ps1 delete applications all --yes

# Simülasyon başlat (CTRL+C ile durdurulabilir)
.\integ\shell.ps1 sim              # sonsuza kadar
.\integ\shell.ps1 sim 30           # 30 saniye

# Arka plandakini durdur
.\integ\shell.ps1 stop-sim

# İşin bitince container'ı durdur
.\integ\shell.ps1 stop
```

## Shell Modu (shell.ps1) Detaylı Kullanım

[`shell.ps1`](./shell.ps1), persistent bir Alpine container'ı (`cs-sim-shell`) kullanarak
her komutu ~1sn'de çalıştırır.

### Alt Komutlar

| Komut | Açıklama |
|-------|----------|
| `start` | Container'ı oluştur ve başlat |
| `stop` | Container'ı durdur ve sil |
| `sim [süre]` | Simülasyon başlat (ön planda, CTRL+C ile durur) |
| `stop-sim` | Arka plandaki simülasyonu durdur (`pkill`) |
| `list ...` / `add ...` / `delete ...` | Normal provisioning komutları |

### Uplink Görünürlüğü

`sim` komutu çalıştırıldığında, terminalde şunlar canlı görüntülenir:

1. **OTAA Join Request:**
   ```
   level=info msg="simulator: send OTAA request" dev_eui=ccf35effc5a1d8e6
   ```

2. **Raw LoRaWAN Uplink Frame:**
   ```
   level=info msg="simulator: uplink frame sent" dev_eui=ccf35effc5a1d8e6 gateways=2 length=23 payload=000000000000000000e6d8a1c5ff5ef3cc0100a1c1a0f1
   ```

3. **Uplink Data:**
   ```
   level=info msg="simulator: send uplink" dev_eui=ccf35effc5a1d8e6 dev_addr=015cb640 f_cnt=1 f_port=10 payload=010203 confirmed=false
   ```

## Konfigürasyon

### 192.168.1.103 Hedef Konfigürasyonu

[`integ/simulator-config/integ.toml`](./simulator-config/integ.toml) şu hedefleri kullanır:

| Alan | Değer |
|------|-------|
| **ChirpStack gRPC** | `192.168.1.103:8080` |
| **MQTT Integration** | `tcp://192.168.1.103:1883` |
| **MQTT Gateway Backend** | `tcp://192.168.1.103:1883` |
| **Tenant ID** | `d49ba144-014c-43a1-85a4-cfa3ecbac0bc` |

> **Not:** Bu konfigürasyon `[[simulator]]` profili içerir; doğrudan simülasyon başlatmak
> ve provisioning CLI komutları için uygundur.

## Hızlı Kıyaslama

| Yöntem | Dosya | Yanıt Süresi | Nasıl Çalışır |
|--------|-------|-------------|---------------|
| ⚡ Shell Modu | `shell.ps1` | **~1sn** | Persistent container, `docker exec` |
| ⏳ Docker run | manuel | ~5-10sn | Her çağrıda yeni container |

## Test Sonuçları (2026-06-04)

| Test | Komut | Sonuç | Süre |
|------|-------|-------|------|
| Device profile listele | `list device-profiles` | ✅ 2 profile bulundu | ~1sn |
| Application listele | `list applications` | ✅ 3 app (Tewt dahil) | ~1sn |
| Port erişilebilirlik | 8080 (gRPC), 1883 (MQTT) | ✅ İkisi de açık | ~10sn |

## Sorun Giderme

### Container çalışmıyor

```powershell
docker ps --filter name=cs-sim-shell
.\integ\shell.ps1 start
```

### Simülasyon çıktısı görünmüyor

- `integ.toml`'da `log_level=4` (info) olduğundan emin olun
- `log_level=3` (warning) ise uplink mesajları görünmez
- `.\integ\shell.ps1 stop-sim` ile durdurup tekrar `sim` başlatın
