# 📋 ChirpStack Simülatörü — Ölçeklenebilirlik, Dinamik Telemetri ve Anomali Simülasyonu Yol Haritası (TODO)

Bu yol haritası, simülatörün **5.000 cihaz ölçeğine çıkarılması**, **zamanla değişen gerçekçi telemetri verisi üretmesi** ve **anormal durumların (anomali) simülasyonu ile tespiti** için yapılacak adımları ve mimari planı içerir.

---

## 🟢 AŞAMA 1: ÖLÇEKLENEBİLİRLİK VE PERFORMANS (5.000 Cihaz Desteği)

5.000 cihazın aynı anda simüle edilmesi Go tarafında hafif goroutine'ler sayesinde kolay olsa da, ChirpStack API limitleri, MQTT ağ trafiği ve tarayıcı arayüzünün (UI) bu veriyi işlemesi sırasında darboğazlar oluşabilir.

### 1. Provisioning ve Aktivasyon Darboğazlarının Giderilmesi
- [ ] **Worker Pool (İşçi Havuzu) ile Kayıt:** Cihazların ChirpStack API'sine kaydedilmesi (`CreateDevice`) ve OTAA aktivasyon isteklerinin (`JoinRequest`) toplu halde gönderilmesi yerine saniyede N adet olacak şekilde rate-limit (hız sınırlayıcı) eklenmesi.
- [ ] **Aşamalı Aktivasyon Gecikmesi (`otaaDelay`):** 5.000 cihazın aynı anda `JoinRequest` atıp MQTT broker'ı ve ChirpStack'i kilitlemesini önlemek için aktivasyon sürelerinin zamana yayılması (örn: `activation_time` parametresinin 5 dakikaya yayılarak rastgele dağıtılması).
- [ ] **MQTT Bağlantı Yönetimi:** Gateway'lerin MQTT broker ile olan bağlantılarının (özellikle MQTT paket yazma kuyrukları) optimize edilmesi ve yazma buffer boyutlarının artırılması.

### 2. SQLite ve API Performansı
- [ ] **SQLite Concurrency (Eşzamanlılık):** Simülatör çalışırken veritabanı yazma kilitlerini engellemek için SQLite'ın `WAL (Write-Ahead Logging)` moduna alınması.
- [ ] **Sayfalama (Pagination) ve Arama:** Arayüzün 5.000 cihazı tek seferde render edip kasmaması için `Devices` ve `Device Intervals` tablolarının backend tarafında gerçek SQL `LIMIT` / `OFFSET` ile sayfalanması (frontend filtreleme yerine backend filtreleme).

### 3. Frontend & WebSocket Optimizasyonu
- [ ] **WebSocket Debouncing:** 5.000 cihaz saniyede bir veri gönderdiğinde WebSocket üzerinden arayüze akan log trafiğinin debouncing/throttling ile azaltılması (örn: logların tarayıcıya 500ms'lik paketler halinde toplu gönderilmesi).
- [ ] **Harita Render Sınırı:** Haritada 5.000 cihazın tamamının çizilmesi yerine sadece aktif/sinyal gönderen cihazların gösterilmesi veya `Leaflet.markercluster` kütüphanesi entegre edilerek harita performansının korunması.

---

## 🟡 AŞAMA 2: ZAMANLA DEĞİŞEN DİNAMİK TELEMETRİ SİMÜLASYONU

Cihazların gerçekçi testler sunabilmesi için statik payload'lar yerine zaman serisi halinde değişen fiziksel sensör verileri (Sıcaklık, Nem, Basınç, Batarya vb.) üretilmelidir.

### 1. Matematiksel Modellerle Telemetri Üretimi
Simülatörün Go backend tarafındaki JavaScript motoru (`goja`) entegrasyonu tamamlanmıştır ve çalışmaktadır:
- [x] **Goja JS Engine Entegrasyonu (Tamamlandı):** Go backend tarafında JavaScript betikleri çalıştırılarak dinamik veri üretimi gerçekleştirilmektedir.
- [ ] **Rastgele Yürüyüş (Random Walk):** Sensörün bir önceki değere bağlı olarak hafifçe artıp azalması (örn: oda sıcaklığı).
- [ ] **Periyodik Dalgalanma (Sine/Cosine):** Gece-gündüz sıcaklık değişimleri veya periyodik çalışan makinelerin titreşim modelleri.
- [ ] **Doğrusal Aşınma/Eğilim (Linear Drift):** Pil seviyesinin yavaşça tükenmesi veya filtre kirliliği gibi sürekli artan/azalan değerler.

### 2. UI / Config Entegrasyonu
- [x] **UI Payload Editor (Tamamlandı):** Çekmece (Drawer) içine dinamik veri üretim formülü yazılabilen "Dinamik Payload Betiği" editörü eklendi.
- [ ] **Önceden Tanımlı Şablonlar (Templates):** Arayüzde tek tıkla seçilebilen şablon formüller (Sıcaklık, Su Sayacı vb.) eklenmesi.

---

## 🔵 AŞAMA 3: ANOMALİ SİMÜLASYONU (Hata Enjeksiyonu)

Anormal durum tespiti algoritmalarını (kural motorları, makine öğrenmesi modelleri) test edebilmek için simülatörün bilerek hatalı/anormal veriler üretmesi sağlanmalıdır.

### 1. Anomali Türlerinin Tanımlanması
- [ ] **Ani Sıçrama (Spike/Surge):** Veride ani ve çok yüksek bir yükseliş/düşüş meydana gelmesi (örn: yangın esnasında sıcaklığın bir anda 80°C'ye çıkması).
- [ ] **Donma / Durgunluk (Stuck/Flatline):** Sensörün sürekli aynı değeri üretmesi (fiziksel olarak donmuş sensör hatası).
- [ ] **Veri Kaybı / Kesinti (Dropout):** Belirli zaman aralıklarında sensörün hiç veri göndermemesi veya geçersiz değer göndermesi (`null`, `0` vb.).
- [ ] **Sapma / Hızlı Aşınma (Drift):** Sensör kalibrasyonunun bozularak değerlerin sürekli yukarı veya aşağı doğru kayması.

### 2. Anomali Tetikleme Mekanizmaları
- [ ] **Manuel Tetikleme (On-Demand):** Web arayüzündeki cihaz listesinden bir cihaza tıklayıp *"Anomali Enjekte Et (Sıcaklık Spike)"* butonu ile anlık tetikleme.
- [ ] **Planlanmış/Olasılıksal Tetikleme (Probabilistic):** Config üzerinden her cihazın %1 olasılıkla gün içinde anomali yaşaması seçeneği.

---

## 🔴 AŞAMA 4: ANORMAL DURUM TESPİTİ (Anomaly Detection)

Simülatörden veya ChirpStack'ten akan verileri analiz edip anormal durumları yakalayacak mekanizmaların kurulması.

### 1. Kural Tabanlı Hızlı Tespit (Threshold-based)
- [ ] Backend veya simülatör entegrasyonu üzerinde basit eşik değerleri (örn: `Sıcaklık > 50°C`) tanımlanıp aşıldığında alarm üretilmesi.

### 2. İstatistiksel Tespit (Statistical / Rolling Window)
- [ ] Cihaz bazlı akan son 20 telemetri verisinin hareketli ortalaması (rolling mean) ve standart sapması (rolling std) hesaplanarak, $Z$-skoru limitleri aşan (örn: $Z > 3$) verilerin anomali olarak işaretlenmesi.

### 3. Alarm ve Görselleştirme Entegrasyonu
- [ ] Anormal durum tespit edildiğinde arayüzdeki haritada cihazın renginin **Kırmızıya** dönmesi ve konsolda `[ANOMALY ALERT]` logu basılması.
- [ ] Tespit edilen anomalilerin SQLite veritabanındaki `alarms` tablosuna kaydedilmesi ve API üzerinden listelenmesi.

---

## 📌 ÖNCELİKLİ ADIMLAR VE YOL HARİTASI

```mermaid
gantt
    title Simülatör Geliştirme Yol Haritası
    dateFormat  YYYY-MM-DD
    section Ölçekleme (5k Cihaz)
    Rate Limit & Worker Pool       :active, p1, 2026-06-11, 4d
    SQLite & UI Paginate          :p2, after p1, 3d
    section Dinamik Telemetri
    Sensör Matematiksel Modelleri   :p3, 2026-06-18, 5d
    UI Şablon & Kod Editörü        :p4, after p3, 4d
    section Anomali & Tespit
    Hata Enjeksiyonu (Spike/Stuck)  :p5, 2026-06-27, 4d
    İstatistiksel Tespit Entegrasyonu:p6, after p5, 5d
```

> [!TIP]
> **Öncelikli Başlangıç Noktası:** 5.000 cihaz simülasyonunu başlatabilmek için öncelikle **ChirpStack API kayıt hız sınırlayıcısını (rate-limiter)** backend tarafında hayata geçirmek en kritik ilk adımdır. Aksi takdirde ChirpStack gRPC API'si aşırı yükten dolayı hata verecektir.
