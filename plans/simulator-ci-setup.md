# 📋 ChirpStack Simülatörü için Docker ve GitHub Actions CI/CD Yapılandırma Planı

Bu plan, `chirpstack-simulator` projesinin hafif ve optimize edilmiş bir Docker imajı olarak derlenmesini, GitHub Actions ile otomatik olarak GitHub Container Registry (GHCR) üzerine yüklenmesini ve sanal makinede güncellenebilir şekilde çalıştırılmasını kapsar.

---

## 🟢 AŞAMA 1: MEVCUT DURUM & ANALİZ

- **Dil ve Altyapı:** Go (Golang 1.18+) projesi.
- **Mevcut Docker Yapısı:** Sadece yerel derleme için kullanılan `Dockerfile-devel` ve buna bağlı `docker-compose.yml` bulunmaktadır. Üretim (production) ortamında çalıştırılabilecek hafif bir imaj bulunmamaktadır.
- **CI/CD Durumu:** Otomatik imaj derleme veya dağıtım (deployment) mekanizması yoktur.

---

## 🟡 AŞAMA 2: PLANLAMA — Yapılacaklar Listesi

### 2.1 Dosya Değişim Tablosu

| Hedef Dosya | Yapılacak İşlem | Rolü | Öncelik |
| :--- | :--- | :--- | :---: |
| `chirpstack-simulator/Dockerfile` | Yeni dosya oluşturma | Çok aşamalı (multi-stage) hafif üretim Docker imajı | 🔴 P0 |
| `chirpstack-simulator/.github/workflows/docker-publish.yml` | Yeni dosya oluşturma | GitHub Actions otomatik imaj derleme ve GHCR'a push | 🔴 P0 |
| `chirpstack-simulator/README.md` | Güncelleme (opsiyonel) | Sanal makinede Watchtower ile otomatik güncelleme kılavuzu ekleme | 🟡 P1 |

---

## 🔵 AŞAMA 3: UYGULAMA ADIMLARI

### 3.1 Adım 1: Çok Aşamalı Üretim Dockerfile Oluşturma
- **Dosya Yolu:** `c:\Projects\falt-workspace\chirpstack-simulator\Dockerfile`
- Derleme aşamasında `golang:1.21-alpine` imajını kullanarak Go binary'si derlenecek, çalışma aşamasında ise minimum `alpine:latest` imajına geçilerek boyut minimize edilecektir (~15-20MB).

### 3.2 Adım 2: GitHub Actions Workflow Oluşturma
- **Dosya Yolu:** `c:\Projects\falt-workspace\chirpstack-simulator\.github/workflows/docker-publish.yml`
- Kod `main` veya `master` branch'ine push edildiğinde otomatik tetiklenecek. GHCR registry'sine login olup imajı yükleyecek.

### 3.3 Adım 3: Sanal Makinede Çalıştırma Kılavuzu
- Sanal makinedeki `docker-compose.yml` ve Watchtower entegrasyonu ile imajların otomatik güncelleme alması sağlanacak.

---

## 🔴 AŞAMA 4: DOĞRULAMA VE SAĞLIK KONTROLLERİ

| Test Koşulu | Beklenen Sonuç |
| :--- | :--- |
| **Yerel Docker Derleme** | `docker build -t cs-sim .` komutu başarıyla tamamlanmalı ve imaj boyutu 30MB'ın altında olmalı. |
| **GitHub Actions Tetikleme** | Depoya push yapıldığında workflow hata vermeden tamamlanmalı. |
| **GHCR İmaj Kontrolü** | GitHub Packages sayfasında `chirpstack-simulator` paketi görünmeli. |
