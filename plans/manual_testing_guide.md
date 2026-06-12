# 📘 ChirpStack SimulaTR — Detaylı Manuel Test ve Doğrulama Kılavuzu

Bu kılavuz, **ChirpStack SimulaTR** projesinde geliştirdiğimiz tüm özel sistemlerin (Hızlı Kurulum Sihirbazı, Dinamik Telemetri JS Motoru, Hata Enjeksiyon Mekanizmaları, Ağ & Port Teşhis Destekli SMTP Raporlama Modülü) yerel ortamda veya bir **Ubuntu Sanal Makinesi (VM)** üzerinde manuel olarak test edilmesi ve doğrulanması için hazırlanmış detaylı adım adım senaryoları ve sorun giderme (troubleshooting) adımlarını içerir.

---

## 📋 Genel Test Altyapısı ve Port Haritası
Testlere başlamadan önce sistemin kullandığı varsayılan portların açık ve dinlemede olduğunu doğrulayın:

| Servis Adı | Varsayılan Port | Açıklama |
| :--- | :--- | :--- |
| **SimulaTR Web UI / API** | `9002` | Simülatör yönetim arayüzü ve REST API. |
| **ChirpStack Web UI** | `8080` | ChirpStack LoRaWAN Network Server yönetim paneli. |
| **MQTT Broker (Mosquitto)** | `1883` | Gateway ve cihaz uplink/downlink mesaj trafiği. |
| **ChirpStack Gateway Bridge** | `1700` (UDP) | UDP üzerinden Gateway paket iletimi. |

### 🔍 Yerel/VM Servis Durumu Kontrol Komutları
Ubuntu terminalinde veya yerel terminalinizde servislerin durumunu kontrol etmek için aşağıdaki komutları kullanabilirsiniz:

```bash
# Docker konteynerlerinin durumunu kontrol edin
docker ps

# Portların dinlenip dinlenmediğini kontrol edin
sudo ss -tulpn | grep -E "9002|8080|1883|1700"

# Simülatör loglarını canlı izleyin
docker-compose logs -f chirpstack-simulator
```

---

## 📂 DETAYLI TEST 1: Hızlı Kurulum Sihirbazı (Bootstrap Wizard)

### 🎯 Amaç
ChirpStack üzerinde sıfırdan ağ bileşenlerini (Tenant, Application, Device Profile, Gateways, Devices) tek tıkla oluşturup simülatör veritabanına kaydetmek ve tüm entegrasyonu doğrulamak.

### 🛠️ Adım Adım İşlemler
1. Tarayıcınızda SimulaTR arayüzüne giriş yapın: `http://localhost:9002` (veya `http://<VM_IP>:9002`)
   * **Kullanıcı:** `admin@falt.com`
   * **Şifre:** `admin123`
2. Sağ üst köşedeki mavi **"Yeni Proje Oluştur"** (Bootstrap Wizard) butonuna tıklayın.
3. Karşınıza gelen sihirbaz adımlarında şu parametreleri girin:
   * **Adım 1 (Organizasyon):**
     * **Organizasyon Adı:** `Batman-Raman-Petrol-Sahasi`
     * **"İleri"** butonuna tıklayın.
   * **Adım 2 (Uygulamalar):**
     * **Uygulama Öneki:** `kuyu-telemetri`
     * **Uygulama Sayısı:** `1`
     * **"İleri"** butonuna tıklayın.
   * **Adım 3 (Cihaz Profilleri):**
     * **Profil Öneki:** `petrol-sensor`
     * **Profil Sayısı:** `1`
     * **"İleri"** butonuna tıklayın.
   * **Adım 4 (Cihazlar ve Gateway):**
     * **Cihaz Öneki:** `raman-kuyu`
     * **Cihaz Sayısı:** `5`
     * **Gateway Öneki:** `raman-gw`
     * **Gateway Sayısı:** `1`
     * **"İleri"** butonuna tıklayın.
   * **Adım 5 (Özet):** Girilen tüm parametreleri teyit edin ve **"Projeyi Oluştur"** butonuna basın.
   * **Adım 6 (Başarı):** Sihirbazın başarıyla bittiğini görün ve **"Kapat"** butonuna basın.

### 🔍 Beklenen Çıktılar & Doğrulama
* **UI Bildirimleri:** Sağ üstte sırasıyla mavi renkli *"Tenant oluşturuluyor..."*, *"Cihaz profili kaydediliyor..."*, *"Cihazlar kaydediliyor..."* toast mesajları ve en son yeşil renkli **"Sihirbaz kurulumu başarıyla tamamlandı!"** bildirimi çıkmalıdır.
* **Simülatör Veritabanı Doğrulaması:**
  Sanal makinenizde veya proje dizininizde SQLite veritabanına sorgu atarak organizasyonun eklendiğini teyit edin:
  ```bash
  sqlite3 simulator.db "SELECT id, name, status FROM organizations WHERE name='Batman-Raman-Petrol-Sahasi';"
  # Beklenen Çıktı: ID|Batman-Raman-Petrol-Sahasi|IDLE
  ```
* **ChirpStack Panel Doğrulaması:** `http://localhost:8080` (admin/admin) adresine gidin:
  - **Tenants** sekmesinde `Batman-Raman-Petrol-Sahasi` kaydını doğrulayın.
  - **Gateways** sekmesinde `raman-gw-` ile başlayan gateway kaydını görün.
  - **Applications** altında `kuyu-telemetri-1` uygulamasını ve bunun içindeki **Devices** sekmesinde `raman-kuyu-1` ile `raman-kuyu-5` arasındaki 5 adet cihazın oluşturulduğunu ve kayıtlı olduğunu teyit edin.

### ❌ Olası Hatalar ve Çözümleri (Troubleshooting)
* **Hata:** Sihirbaz aşamasında `ChirpStack API hatası` veya `Bağlantı reddedildi` hatası alınması.
* **Çözüm:** `simulator.toml` dosyasındaki `[chirpstack]` ayarlarını kontrol edin. `api_token` değerinin geçerli bir admin API anahtarı olduğundan ve `server` adresinin (`localhost:8080` veya konteyner içi gRPC portu) doğru olduğundan emin olun.

---

## 📈 DETAYLI TEST 2: Dinamik Telemetri & JS Betik Editörü

### 🎯 Amaç
Cihazların statik veriler yerine zamanla değişen fiziksel sensör modellerini JS motoru (Goja) üzerinde doğru şekilde simüle ettiğini, hex dönüşümlerini ve arayüz grafik motorunu doğrulamak.

### 🛠️ Adım Adım İşlemler
1. Sol menüden **"Dinamik Telemetri"** sekmesine geçin.
2. Üstteki açılır menüden Test 1'de oluşturduğumuz **"Batman-Raman-Petrol-Sahasi"** organizasyonunu seçin.
3. **"Hazır Şablon Seçin"** kısmından **"Sıcaklık Sensörü (Sine Wave + Noise)"** şablonunu seçin.
4. Editör içerisine gelen JS kodunu inceleyin. Kodun temeli şu şekildedir:
   ```javascript
   // Diurnal (günlük) sıcaklık dalgalanması simülasyonu
   var timeScale = fCnt / 24.0;
   var baseTemp = 25.0 + Math.sin(timeScale * 2 * Math.PI) * 10.0;
   var noise = (Math.random() - 0.5) * 2.0;
   var finalTemp = baseTemp + noise;
   
   // Eğer anomali aktifse sıcaklığı aniden 15 derece artır
   if (anomalyActive) {
       finalTemp += 15.0;
   }
   
   // 100 ile çarparak tamsayıya çevir (Örn: 25.43 -> 2543)
   var intTemp = Math.round(finalTemp * 100);
   
   // 2 Byte Hex formatına dönüştür (MSB & LSB)
   var payload = [];
   payload[0] = (intTemp >> 8) & 0xFF; // High Byte
   payload[1] = intTemp & 0xFF;        // Low Byte
   ```
5. **"Betikleri Dene / Simüle Et"** butonuna tıklayın.

### 🔍 Beklenen Çıktılar & Doğrulama
* **Veri Tablosu:** Alt tarafta beliren tabloda `fCnt` değeri 0'dan 23'e kadar giden 24 adet satır oluşmalıdır.
* **Grafik Kontrolü:** Sağ tarafta diurnal (gece-gündüz) salınımını temsil eden temiz bir **Sinüs Dalgası** çizildiğini teyit edin.
* **Hex Hesaplama ve Kod Çözme Doğrulaması:**
  - Tablodan rastgele bir satırı seçin. (Örn: `fCnt = 6` olsun).
  - Üretilen Hex kolonundaki değere bakın (Örn: `0B5E`).
  - Çözümlenen Değer kolonuna bakın (Örn: `29.10 °C`).
  - **Manuel Hesaplama Doğrulaması:**
    `0x0B` tamsayı olarak 11'dir. `0x5E` ise 94'tür.
    Değer = `(11 << 8) | 94 = 2816 + 94 = 2910`.
    2910 değerini 100'e böldüğümüzde `29.10 °C` elde edilir. Tablodaki çözümlenen değer ile bu manuel hesabın uyuştuğunu doğrulayın.
6. Sağ taraftaki yeşil **"Ayarları Kaydet"** butonuna tıklayarak JS betiğini sisteme kaydedin.

### ❌ Olası Hatalar ve Çözümleri (Troubleshooting)
* **Hata:** Tabloda veya grafikte hiçbir şey görünmüyor, tarayıcı konsolunda veya arayüzde kırmızı hata kutusu çıkıyor.
* **Çözüm:** JS kodunda syntax hatası yapmış olabilirsiniz. Kodda parantezleri veya değişken adlarını (`fCnt`, `anomalyActive` gibi sistem değişkenleri büyük/küçük harfe duyarlıdır) kontrol edin.

---

## 📡 DETAYLI TEST 3: Simülasyon Çalıştırma & Canlı Log Akışı

### 🎯 Amaç
Cihazların şebekeye katılma (Join) süreçlerini ve veri gönderim döngülerini canlı olarak izlemek, MQTT trafiğini teyit etmek.

### 🛠️ Adım Adım İşlemler
1. Üst menü barında bulunan yeşil **"▶ Başlat"** butonuna tıklayın.
2. Sol menüden **"Konsol"** sekmesine geçin.
3. Aynı esnada bir terminal açıp MQTT broker'ı dinlemeye başlayın (VM üzerinde):
   ```bash
   # raman-kuyu-1 cihazının uplink trafiğini MQTT üzerinden canlı izleyin
   mosquitto_sub -h localhost -p 1883 -t "application/+/device/+/event/up" -v
   ```

### 🔍 Beklenen Çıktılar & Doğrulama
* **Durum Badge'i:** Üst menüdeki durum göstergesinin yanıp sönen yeşil renkli **"RUNNING"** moduna geçtiğini doğrulayın.
* **Arayüz Konsol Akışı:**
  - `[Batman-Raman-Petrol-Sahasi] [OTAA] Join-Request sent for DevEUI: ...` logunun düştüğünü,
  - Hemen ardından `[Batman-Raman-Petrol-Sahasi] [OTAA] Join-Accept received` logunun geldiğini,
  - Ardından cihazların `[UPLINK] fCnt=1` şeklinde veri paketlerini göndermeye başladığını görün.
* **Filtreleme Özelliği:** Arama kutusuna `raman-kuyu-3` yazın. Konsolun anlık olarak filtrelendiğini ve sadece bu cihaza ait logların aktığını görün. Filtreyi temizlediğinizde tüm logların geri geldiğini doğrulayın.
* **MQTT Mesaj Doğrulaması:** Terminaldeki `mosquitto_sub` çıktısını inceleyin. JSON formatında gelen verinin içerisindeki `data` alanının, Test 2'de JS motorunun ürettiği base64 kodlu veri (örn: `C14=`) ile örtüştüğünü görün.

### ❌ Olası Hatalar ve Çözümleri (Troubleshooting)
* **Hata:** Loglar akmıyor, cihazlar sürekli `Join-Request sent` aşamasında kalıyor ve `Join-Accept` gelmiyor.
* **Çözüm:** ChirpStack tarafında cihazların `AppKey` ve `JoinEUI` bilgilerini kontrol edin. Ayrıca MQTT Broker (`mosquitto`) servisinin çalışıp çalışmadığını `sudo systemctl status mosquitto` komutu ile kontrol edin.

---

## ⚠️ DETAYLI TEST 4: Manuel Hata Enjeksiyonu (Anomaly Injection)

### 🎯 Amaç
Çalışan simülasyondaki cihazlara anlık olarak Spike, Dropout, Flatline veya Drift anomalileri enjekte etmek ve cihazların bu hatalardan sonra normale dönme senaryolarını test etmek.

### 🛠️ Adım Adım İşlemler
1. Simülasyon çalışır durumdayken (`RUNNING`) sol menüden **"Cihaz Durumları"** sekmesine tıklayın.
2. Cihaz listesinden `raman-kuyu-1` cihazının satırına tıklayın. Ekranın sağından **Cihaz Detay Çekmecesi (Details Drawer)** açılacaktır.
3. Çekmecedeki hata enjeksiyon fonksiyonlarını sırasıyla test edin:

#### A. Spike (Ani Yükseliş) Testi
1. Çekmeceden **"Spike Tetikle"** butonuna basın.
2. Sol menüden **"Konsol"** sekmesine geçin ve logları izleyin.
3. **Doğrulama:**
   - Konsolda bir sonraki uplink gönderiminde sarı renkli `[Batman-Raman-Petrol-Sahasi] raman-kuyu-1 simulator: injecting anomaly` uyarısının çıktığını görün.
   - Sıcaklık değerinin normal sinüs salınımının çok üzerinde bir değere (örneğin normalde 25°C civarındayken 40°C üzerine) çıktığını doğrulayın.
   - Bir sonraki adımda değerin otomatik olarak normal sinüs değerine geri döndüğünü (Spike anomalisinin tek atımlık olduğunu) doğrulayın.

#### B. Dropout (Veri Kaybı) Testi
1. Çekmeceye geri dönüp **"Veri Kaybı Tetikle"** butonuna basın.
2. Konsol sekmesine geçin.
3. **Doğrulama:**
   - `raman-kuyu-1` cihazının o adımdaki uplink gönderiminin konsolda tamamen atlandığını (hiç log basılmadığını) doğrulayın.
   - ChirpStack arayüzüne gidip `raman-kuyu-1` detayına baktığınızda `fCnt` değerinin 1 arttığını ancak paketin içerik verisinin boş veya kayıp olduğunu doğrulayın.

#### C. Flatline (Donma) Testi
1. Çekmeceden **"Donma Başlat"** butonuna tıklayın. (Buton rengi aktif duruma geçecektir).
2. Konsol sekmesinden `raman-kuyu-1` loglarını izleyin.
3. **Doğrulama:**
   - Cihazın her yeni uplink adımında gönderdiği hex payload'unun tamamen aynı değerde donduğunu (Örn: Sürekli `0AC2` -> `0AC2` -> `0AC2`) doğrulayın.
   - Bu durumun simülasyon sürdüğü müddetçe devam ettiğini görün.
4. Çekmeceden **"Donma Durdur"** butonuna tıklayarak iptal edin ve verinin tekrar dalgalanmaya başladığını doğrulayın.

#### D. Drift (Sapma) Testi
1. Çekmeceden **"Sapma Başlat"** butonuna tıklayın.
2. Konsoldan cihazın uplink loglarındaki sıcaklık değerini takip edin.
3. **Doğrulama:**
   - Her yeni uplink adımında sıcaklığın birikimli olarak arttığını gözlemleyin (Örn: 25.1°C -> 25.6°C -> 26.1°C -> 26.6°C...).
4. **"Sapma Durdur"** butonuna tıklayarak sapmayı kapatın ve değerin normal seyrine döndüğünü teyit edin.

---

## 🚨 DETAYLI TEST 5: Olasılıksal Anomali Enjeksiyonu

### 🎯 Amaç
Cihazların önceden yapılandırılan olasılıklara göre arka planda kendiliğinden (rastgele) hata üretmesini ve ayarlanan süre sonunda otomatik olarak düzelmesini doğrulamak.

### 🛠️ Adım Adım İşlemler
1. Üst menüden simülasyonu durdurun (**"■ Durdur"**).
2. Sol menüden **"Organizasyonlar"** listesine gelin.
3. `Batman-Raman-Petrol-Sahasi` organizasyonunun sağındaki **Düzenle (Kalem)** butonuna tıklayın.
4. Açılan pencerede en alta inin ve **"Olasılıksal Anomali Enjeksiyonu"** kısmını yapılandırın:
   * **Olasılık (%):** `30` (Her pakette %30 olasılıkla rastgele hata tetiklensin).
   * **Anomali Türleri:** `Spike` ve `Flatline` kutularını işaretleyin.
   * **Anomali Süresi (Paket Sayısı):** `4` (Hata tetiklendiğinde ardışık 4 paket boyunca sürsün).
5. **"Kaydet"** butonuna basın.
6. Simülasyonu tekrar başlatın (**"▶ Başlat"**).

### 🔍 Beklenen Çıktılar & Doğrulama
* **Arka Plan Hata Akışı:** Konsol loglarında, siz hiçbir şeye tıklamadığınız halde rastgele cihazlarda sarı renkli `[Batman-Raman-Petrol-Sahasi] <cihaz-adi> simulator: injecting anomaly` uyarısının belirdiğini gözlemleyin.
* **Süre Kontrolü:** Hata başlayan bir cihazın tam 4 paket boyunca (örneğin Flatline seçildiyse 4 ardışık paket boyunca aynı hex değerini) hata durumunda kaldığını, 5. pakette ise otomatik olarak normale döndüğünü teyit edin.

---

## ✉️ DETAYLI TEST 6: Sistem Sağlığı & E-Posta Raporlama (Ağ Teşhisi)

### 🎯 Amaç
Ubuntu sanal makinesinde ağ güvenlik duvarı (port engelleri) ve e-posta sunucu erişim yeteneklerini doğrulamak, günlük rapor içeriğini test etmek.

### 🛠️ Adım Adım İşlemler

#### A. SMTP Ağ ve Port Engeli Teşhis Testi (VM Dışarıya Kapalı Durum)
1. Sol menüden **"Ayarlar"** -> **"E-Posta Raporlama"** sekmesine geçin.
2. Eğer `simulator.toml` dosyanızda SMTP ayarları henüz yapılandırılmadıysa:
   - Sayfadaki **Raporlama Durumu** badge'inin gri/kırmızı renkte **"Pasif"** yazdığını doğrulayın.
3. **"Test E-postası Gönder"** butonuna tıklayın.
4. **Doğrulama (Hata Yakalama):** Butonun sağında kırmızı renkle sunucudan dönen hata mesajının çıktığını görün.
   - *Hata Mesajı Örneği:* `dial tcp: connection timeout` veya `authentication failed`.
   - Bu hata, VM üzerindeki 587 veya 465 portunun hosting sağlayıcınız (AWS, Azure vb.) tarafından dışarıya kapatıldığını veya SMTP kimlik bilgilerinin yanlış olduğunu gösterir.

#### B. Ubuntu VM Üzerinde Ağ Teşhis Komutları
Eğer yukarıdaki adımda timeout hatası aldıysanız, VM terminalinde şu komutları çalıştırarak ağ durumunu teşhis edin:
```bash
# UFW (Gelişmiş Güvenlik Duvarı) durumunu kontrol edin
sudo ufw status

# SMTP sunucusuna el ile telnet/netcat bağlantısı deneyin
nc -zv smtp.gmail.com 587
# VEYA
curl -v telnet://smtp.gmail.com:587

# Eğer bağlantı kurulamıyorsa, VM sağlayıcınızın dışarı giden (outbound) 587/465 portlarını engellediğini teyit edin.
```

#### C. Başarılı Rapor Gönderim Testi
1. Projenizin kök dizinindeki `simulator.toml` dosyasını bir metin editörü ile açın ve geçerli bir SMTP servisi tanımlayın (Örn: Gmail uygulama şifresi ile):
   ```toml
   [smtp]
     enabled = true
     host = "smtp.gmail.com"
     port = 587
     username = "sizin-adresiniz@gmail.com"
     password = "xxxx-xxxx-xxxx-xxxx" # Google Hesaplar -> Güvenlik -> Uygulama Şifresi
     encryption = "tls" # STARTTLS için 'tls', implicit SSL (port 465) için 'ssl'
     from_email = "sizin-adresiniz@gmail.com"
     report_email = "raporu-alacak-adres@gmail.com"
   ```
2. Simülatör servisini yeniden başlatın:
   ```bash
   # Docker kullanıyorsanız:
   docker-compose restart chirpstack-simulator
   
   # Go binary olarak çalıştırıyorsanız:
   ./chirpstack-simulator
   ```
3. Arayüzde **Ayarlar -> E-Posta Raporlama** sayfasına tekrar gelin.
4. **Raporlama Durumu** badge'inin yeşil renkte **"Aktif"** yazdığını görün.
5. **"Test E-postası Gönder"** butonuna tıklayın.
6. **Doğrulama:**
   - Butonun sağında yeşil renkte **"Başarılı! Test e-postası teslim edildi."** çıktısını görün.
   - `raporu-alacak-adres@gmail.com` gelen kutusuna gidin.
   - **Gelen E-posta İncelemesi:**
     - Konu başlığının: `[ChirpStack SimulaTR] Günlük Sistem Sağlığı Raporu` olduğunu teyit edin.
     - E-postanın modern koyu mod (dark mode) tasarımına sahip olduğunu,
     - İçerikte **Uptime (Çalışma Süresi)**, **SQLite DB Boyutu**, **Aktif Tenant/Cihaz/Gateway Sayıları** ve son 24 saatlik **LoRaWAN Paket Telemetri Sayıları** (Uplink, Downlink, Join) bilgilerinin doğru şekilde tablo halinde raporlandığını doğrulayın.

---

## 🛠️ SQLite Veritabanı ile Durum ve Rapor Doğrulama
Simülasyon esnasında ve sonrasında veritabanı durumunu manuel doğrulamak için yararlı SQLite sorguları:

```bash
# SQLite konsoluna bağlanın
sqlite3 simulator.db

# 1. Raporlama sistemi durum geçmişini sorgulayın
SELECT * FROM system_states ORDER BY timestamp DESC LIMIT 5;

# 2. Toplam cihaz ve gateway sayılarını doğrulayın
SELECT COUNT(*) FROM devices;
SELECT COUNT(*) FROM gateways;

# 3. Simüle edilen anlık durum kaydını doğrulayın
SELECT key, value FROM system_states WHERE key='last_report_sent';
```
