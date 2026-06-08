# ChirpStack Simulator — HTTP API + Frontend UI Mimari Planı

> **Kısıt:** Bu planda sadece `chirpstack-simulator/` klasörü değiştirilir.
> `backend/` ve `frontend/` KESİNLİKLE dokunulmaz.

---

## 1. Amaç

Simülatöre HTTP API ve web arayüzü ekleyerek:

1. **Cihaz/Gateway provisioning** → API ile ChirpStack'e otomatik kayıt
2. **Simülasyon başlat/durdur** → Web UI üzerinden tek tıkla uplink akışı
3. **Durum izleme** → Aktif cihaz sayısı, uplink metrikleri
4. **Canlı log** → Simülasyon akışını tarayıcıdan izleme

---

## 2. Mevcut Durum

### 2.1. HTTP API (✓ Tamamlandı)

| Dosya | Sorumluluk | Durum |
|-------|-----------|-------|
| `internal/api/server.go` | HTTP handler'lar, request parse, response | ✅ |
| `internal/api/store.go` | Simülasyon durum deposu (singleton state) | ✅ |
| `internal/api/__tests__/server_test.go` | API testleri | ✅ |
| `internal/config/config.go` | `HTTP.Bind` alanı | ✅ |
| `cmd/root_run.go` | `setupHTTP` task'i | ✅ |
| `cmd/configfile.go` | `[http]` template bölümü | ✅ |

### 2.2. Frontend UI (❌ Eksik)

Web arayüzü henüz yok. Kullanıcı şu an sadece `curl` ile API'ye erişebiliyor.

---

## 3. Tasarım Kararları

### 3.1. Neden Embedded SPA (Tekil Binary)?

| Seçenek | Değerlendirme |
|---------|--------------|
| **A) Embedded HTML/JS/CSS (Go embed)** | ✅ **Seçildi** — Tek binary, CORS yok, ek bağımlılık yok |
| B) Ayrı React/Vue projesi | ❌ Node.js gerektirir, CORS sorunu, ayrı deploy |
| C) Go templates (SSR) | ❌ Interaktif güncelleme için JS gerekir, karmaşık |

**Go `embed` paketi ile** frontend dosyaları binary'nin içine gömülür, HTTP server üzerinden tek portta servis edilir.

### 3.2. Neden Auth Yok?

Bu araç **lokal geliştirme/simülasyon** aracıdır. Production'a değil, geliştirme ortamına yöneliktir. Auth eklemek gereksiz karmaşıklık yaratır. Zaten `localhost`'ta çalışır.

### 3.3. Neden Tek Simülasyon?

Aynı anda birden fazla simülasyon çalıştırmak ChirpStack API'sinde çakışma yaratır. **Tek aktif simülasyon** yeterlidir.

---

## 4. API Tasarımı (✓ Mevcut)

| Method | Path | Açıklama |
|--------|------|----------|
| `GET` | `/api/status` | Simülasyon durumu + metrikler |
| `POST` | `/api/start` | Simülasyonu başlat (config ile) |
| `POST` | `/api/stop` | Simülasyonu durdur |
| `GET` | `/api/health` | Health check (ping) |

Detaylı request/response formatları için [README](/README.md)'e bakın.

---

## 5. Frontend UI Tasarımı

### 5.1. Sayfa Yapısı

```
┌─────────────────────────────────────────────────────┐
│  🟢 ChirpStack Simulator Controller                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Bağlantı     │  │ Durum        │  │ Metrikler  │  │
│  │ • Health: ✅ │  │ • Status     │  │ • JoinReq  │  │
│  │ • Port: 8081│  │ • Uptime     │  │ • Uplink   │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Simülasyon Konfigürasyonu                     │   │
│  │ ┌────────────────┐  ┌─────────────────────┐   │   │
│  │ │ Tenant ID      │  │ Device Count:  [10] │   │   │
│  │ │ [_____________]│  │ Gateway Count: [3]  │   │   │
│  │ │ Uplink Interval│  │ Duration:   [0s]    │   │   │
│  │ │ [30s_________] │  │ App Name:   [sim-1] │   │   │
│  │ │ ...            │  │ ...                  │   │   │
│  │ └────────────────┘  └─────────────────────┘   │   │
│  │                                                 │   │
│  │ [ 🟢 BAŞLAT ]  [ 🔴 DURDUR ]                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Log / Olay Akışı                              │   │
│  │ [10:00:01] Simülasyon başlatılıyor...         │   │
│  │ [10:00:02] 10 cihaz oluşturuldu              │   │
│  │ [10:00:03] Uplink akışı başladı              │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 5.2. Teknoloji

| Bileşen | Teknoloji |
|---------|----------|
| HTML | Tek sayfa, semantic HTML5 |
| CSS | Pure CSS (flexbox/grid), framework yok |
| JS | Vanilla JS (ES6+), `fetch` API, framework yok |
| İkonlar | Unicode/emoji (bağımlılık yok) |
| Gömme | `//go:embed frontend/*` ile Go binary'sine |

**Neden framework yok?** Tek sayfalık basit bir araç yüzü. jQuery, React, Vue eklemek gereksiz şişkinlik.

### 5.3. Dosya Listesi

| Dosya | İçerik | Yaklaşık Satır |
|-------|--------|---------------|
| `frontend/index.html` | Ana HTML sayfa yapısı | ~80 |
| `frontend/app.js` | API çağrıları, DOM güncelleme, event handling | ~200 |
| `frontend/style.css` | Tema, layout, responsive tasarım | ~150 |
| `internal/api/ui.go` | Go embed + `/` route handler | ~30 |

**Toplam yeni satır:** ~460

---

## 6. Go Tarafı Değişiklikleri

### 6.1. `internal/api/server.go` — UI Route Ekleme

```go
// New fonksiyonunda '/' route'u eklenir:
mux.Handle("/", uiHandler())
```

UI handler, embedded frontend dosyalarını `/` path'inden servis eder. API endpoint'leri `/api/*` path'inde kalmaya devam eder.

### 6.2. `internal/api/ui.go` — Yeni Dosya

```go
package api

import (
    "embed"
    "io/fs"
    "net/http"
)

//go:embed frontend/*
var frontendFiles embed.FS

func uiHandler() http.Handler {
    fsys, _ := fs.Sub(frontendFiles, "frontend")
    return http.FileServer(http.FS(fsys))
}
```

---

## 7. Frontend Detay Tasarımı

### 7.1. API İletişimi

```
app.js (tarayıcı)
  │
  ├── GET  /api/health    → connection status
  ├── GET  /api/status    → state + metrics
  ├── POST /api/start     → {tenant_id, device_count, ...}
  └── POST /api/stop      → {}
```

Tüm iletişim `fetch()` ile asenkron. Herhangi bir proxy veya CORS yapılandırması gerekmez çünkü aynı port (`:8081`) üzerinden servis edilir.

### 7.2. UI State Machine

```
┌──────────────────────────────────────────────────┐
│  Sayfa Yüklendi → health check → bağlantı kontrolü │
└──────────────────────────────────────────────────┘
                         │
                    ┌─────▼──────┐
                    │  IDLE       │ ← Başlangıç / durdu
                    └─────┬──────┘
                          │ BAŞLAT butonu
                    ┌─────▼──────┐
                    │  STARTING   │ ← "Başlatılıyor..." animasyonu
                    └─────┬──────┘
                          │ poll /api/status
                    ┌─────▼──────┐
                    │  RUNNING    │ ← Canlı metrikler
                    └─────┬──────┘
                          │ DURDUR butonu / duration doldu
                    ┌─────▼──────┐
                    │  IDLE       │ ← "Tamamlandı" mesajı
                    └────────────┘
```

### 7.3. Komponentler

| Komponent | Açıklama |
|-----------|----------|
| **StatusBar** | Bağlantı durumu (health), simülasyon durumu, uptime gösterir. Renk kodlu: 🟢 İdle, 🟡 Starting, 🟢 Running, 🔴 Stopping, ⚠️ Error |
| **ConfigPanel** | Tüm simülasyon parametreleri için form girdileri. Gruplandırılmış: General, Device, Gateway |
| **ControlButtons** | BAŞLAT (yeşil) ve DURDUR (kırmızı) butonları. Duruma göre enable/disable |
| **MetricsPanel** | İstatistik kartları: Join-Request, Join-Accept, Device Uplink, Gateway Uplink, App Uplink |
| **LogPanel** | Otomatik kaydırmalı olay akışı. Son 50 olayı gösterir. Renk kodlu log seviyeleri |

### 7.4. Responsive Tasarım

- **Mobil (< 768px):** Tek kolon, dikey kaydırma
- **Tablet (768-1024px):** İki kolon (config + durum)
- **Desktop (> 1024px):** Üç kolon (durum + config + metrikler)

---

## 8. Durum Makinesi

```
    ┌──────────┐
    │   IDLE   │ ← Başlangıç / Temizlendi
    └────┬─────┘
         │ POST /api/start
         ▼
    ┌──────────┐
    │ STARTING │ ← ChirpStack'te provisioning
    └────┬─────┘
         │
         ▼
    ┌──────────┐
    │ RUNNING  │ ← Uplink akışı aktif
    └────┬─────┘
         │
         ├── POST /api/stop → STOPPING → IDLE
         └── Duration doldu → STOPPING → IDLE
```

---

## 9. Hata Yönetimi

| Senaryo | HTTP Code | UI Davranışı |
|---------|-----------|-------------|
| Zaten çalışıyorsa | 409 | Kırmızı toast: "Simülasyon zaten çalışıyor" |
| Zaten durmuşsa | 409 | Kırmızı toast: "Simülasyon zaten durmuş" |
| Geçersiz JSON | 400 | Form validasyon hatası göster |
| Eksik tenant_id | 400 | Tenant ID alanı kırmızı çerçeve |
| Sunucu hatası | 500 | "Sunucu hatası" mesajı |
| Bağlantı hatası | - | "API'ye bağlanılamadı" banner'ı |

---

## 10. Kullanım

```bash
# Build
make build

# Çalıştır
./build/chirpstack-simulator -c config.toml

# Tarayıcıdan aç
open http://localhost:8081
```

---

## 11. Özet

| Kriter | Değer |
|--------|-------|
| Yeni dosya (backend) | 1 (`internal/api/ui.go`) |
| Yeni dosya (frontend) | 3 (`index.html`, `app.js`, `style.css`) |
| Değişen dosya | 1 (`internal/api/server.go`) |
| Plan güncellemesi | 1 (`simulator-http-api-plan.md`) |
| Toplam yeni satır | ~460 |
| Yeni bağımlılık | Yok |
| Frontend framework | Yok (vanilla JS) |
| Auth | Yok (lokal araç) |
| Binary boyut artışı | ~10 KB (HTML/CSS/JS) |
| HTTP portu | `:8081` (API + UI aynı port) |
