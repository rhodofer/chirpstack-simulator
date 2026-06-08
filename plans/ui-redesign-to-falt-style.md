# UI Redesign: Falt-Style Tasarım Uyarlaması

## 1. Hedef

Mevcut UI'ı referans görseldeki **"Falt" SaaS** tarzına yaklaştırmak:
- Sol **primary sidebar** (logo + ana navigasyon) ve iç içe **secondary nav** (alt menü)
- Üst **top bar** (sayfa sekmeleri + global eylemler)
- Tablo bazlı ana içerik (Organizasyonlar)
- Sayfalama (1, 2, İleri/Geri) + sayfa başına kayıt
- Token ile vurgulanan durum rozetleri (AKTİF vb.)

## 2. Referans Görselden Çıkarılan Bileşenler

| Bileşen | Görseldeki Karşılığı | Mevcut Yapıda |
|---|---|---|
| **Primary Sidebar (koyu)** | "Falt SaaS" logosu, dashboard/uygulama ikonu, ayarlar ikonu, profil chip (alt) | Koyu sidebar var, ama sadece organizasyon listesi içeriyor |
| **Secondary Nav (sidebar içi)** | Genel Bakış, Yönetim (Organizasyonlar, Birimler, Varlıklar, Kullanıcı Yönetimi), Uygulamalar (Ağ/Ağ Geçitleri/Cihazlar/Cihaz Profilleri/Cihaz Profilleri/Varlık Profilleri/Gruplar), Veri & Analiz, Canlı Konsol, Güvenlik & Yetki | **Yok** — sidebar sadece listeden oluşuyor |
| **Top Bar** | Split-view sekmeler (Genel Bakış / Cihazlar / Ayarlar) + sağda karanlık/aydınlık mod toggle | Üst bar var ama sekme yapısı + tema toggle yok |
| **Tablo** | Organizasyon adı (nokta + isim + alt başlık) | Durum (badge) | ID (kısaltılmış) | Tarih | İşlemler (göz/pencere/çöp ikonu) | **Yok** — sadece form tabanlı UI |
| **Tablo Üstü Araç Çubuğu** | Arama kutusu, yenile butonu, "Yeni Organizasyon Ekle" primary CTA | **Yok** |
| **Tablo Altı Footer** | "Sayfa başına: 5", "Toplam: 6 Organizasyon", "Geri / 1 / 2 / İleri" | **Yok** |
| **Durum Rozeti** | Oval, hafif transparan arkaplan + accent renk ("AKTİF") | Var, ama daha az belirgin |

## 3. Mimari Kararlar

### 3.1. Layout Genişlemesi
```
.app
├── .primary-sidebar    (220px sabit, en koyu zemin, navigasyon)
│   ├── .primary-sidebar-header   (Falt logo + "SaaS")
│   ├── .primary-nav              (Dashboard ikonu, Uygulamalar, vb.)
│   └── .primary-sidebar-footer   (Sistem Yöneticisi chip)
│
├── .secondary-sidebar  (260px, secondary nav + içerik listesi)
│   ├── .secondary-nav            (Genel Bakış, Yönetim alt menüsü, vb.)
│   ├── .secondary-content-header (Organizasyonlar başlık + sayaç)
│   ├── .secondary-list           (Organizasyon kartları)
│   └── .secondary-footer         (versiyon)
│
└── .main
    ├── .top-bar                  (Breadcrumb/tabs + global eylemler)
    │   ├── .top-bar-tabs         (Genel Bakış / Cihazlar / Ayarlar)
    │   └── .top-bar-actions      (tema toggle, durum badge, başlat/durdur)
    ├── .page-header              (Başlık + alt başlık + sağ: arama + CTA'lar)
    ├── .data-table-wrapper       (Tablo)
    └── .table-footer             (Sayfa başına, toplam, pagination)
```

### 3.2. Sidebar Stratejisi (İÇ İÇE 2 Sidebar)
- **Primary Sidebar (220px)**: Statik, soluk, sadece navigasyon (dashboard ikonu, uygulamalar ikonu, ayarlar ikonu, vb.) + alt kısımda kullanıcı profili.
- **Secondary Sidebar (260px)**: Primary'de seçili bölüme göre **alt menü** + **içerik listesi** (organizasyonlar, cihazlar, vb.).
- Mevcut sidebar yapısı `secondary-sidebar` rolüne terfi edecek + yeni `primary-sidebar` eklenecek.

### 3.3. Tablo Stratejisi
- Organizasyon listesi **artık formun solundaki liste olmaktan çıkıp** ana içerik alanında **tablo** olarak gösterilecek.
- Tablo sütunları: `Organizasyon Adı` • `Durum` • `ID` • `Kayıt Tarihi` • `İşlemler`
- İşlemler: `görüntüle` (göz ikonu), `düzenle` (kalem ikonu), `sil` (çöp ikonu).
- Tıklama → organizasyon detayına yönlendirir (veya satır inline seçilir).
- Mevcut form (Simülasyon Ayarları) **sağda drawer/panel** olarak açılır (örn. düzenle'ye tıklayınca).

### 3.4. Tema & Renk
- Mevcut koyu tema korunacak.
- **Primary vurgu rengi**: Turuncu/Altın (`#f0a040` veya `#ffb547`) — referans görseldeki turuncu aksan. (Mevcut mor `--accent: #6c5ce7` turuncuya çevrilecek.)
- **Aktif sidebar elemanı**: Turuncu arkaplan (örn. `rgba(240,160,64,0.15)`).
- **Hover efektleri**: Yumuşak geçişler (200ms).
- **Tipografi**: Başlıklar "Space Grotesk" veya "Inter", gövde "Inter" — mevcut sistem font yığınına ek olarak.

### 3.5. Top Bar Tab Yapısı
- Tıklanabilir 3 sekme: `Genel Bakış` (varsayılan aktif), `Cihazlar`, `Ayarlar`.
- Her sekme farklı içerik gösterir:
  - **Genel Bakış**: Organizasyonlar tablosu (ana sayfa)
  - **Cihazlar**: Cihaz listesi (placeholder)
  - **Ayarlar**: Sistem ayarları (ChirpStack bağlantı bilgisi, MQTT, vb.)

## 4. Veri & Davranış Kararları

| Karar | Açıklama |
|---|---|
| **Organizasyon verisi** | `/api/organizations` (mevcut) — ChirpStack'ten çekilen tenant listesi |
| **Tablo sayfalama** | Client-side (10/25/50 kayıt) — kayıt sayısı az, backend pagination gereksiz |
| **Arama** | Tablo içinde client-side filtre (ad, ID) |
| **Sıralama** | Client-side (tüm sütunlarda, başlığa tıklayınca) |
| **Row click** | Organizasyonu seçili yapar, form drawer'ı açar (sağdan slide-in) |
| **"Yeni Organizasyon Ekle"** | Modal açar (mevcut modal korunur, sadece görseli güncellenir) |
| **Drawer (form)** | Düzenle/Görüntüle'ye tıklayınca sağdan kayan panel (480px), içinde mevcut form |

## 5. Dosya Bazlı Uygulama Planı

### 5.1. `internal/api/frontend/index.html` (Tam Yeniden Yazım)

**Yapı:**
- `<aside class="primary-sidebar">` → Logo + ana nav + kullanıcı chip
- `<aside class="secondary-sidebar">` → Alt menü + organizasyon listesi (içerik olarak gizlenecek, sadece "Yönetim > Organizasyonlar" görünümü)
- `<main class="main">` → Top bar + page header + table + footer

**Tab sekmeleri (top bar):**
- `.top-bar-tabs` → 3 buton: `#tab-overview`, `#tab-devices`, `#tab-settings`
- Her tıklama `.tab-content` içindeki ilgili bölümü gösterir

**Tablo:**
- `<table class="data-table">` içinde `<thead>` ve `<tbody id="org-table-body">`
- Sütun başlıkları tıklanabilir (sıralama)
- Her satır: `.data-row` → hücreler + sağda `.row-actions` (3 ikon butonu)

**Drawer:**
- `<aside class="drawer" id="org-drawer">` → 480px sağdan slide-in
- İçinde: Organizasyon adı başlık + mevcut config formu + Başlat/Durdur butonları

**Modal:** Mevcut modal korunur, sadece görsel iyileştirme.

### 5.2. `internal/api/frontend/style.css` (Genişletme)

**Yeni CSS Değişkenleri:**
```css
--bg-deepest: #0a0c12;   /* primary sidebar en koyu */
--bg-primary-sidebar: #0d1018;
--bg-secondary: #11141d; /* secondary sidebar */
--accent-warm: #f0a040;  /* turuncu vurgu */
--accent-warm-soft: rgba(240,160,64,0.15);
--border-soft: #1f2330;
```

**Yeni Sınıflar:**
- `.primary-sidebar` (220px, en koyu, dikey ikon menüsü)
- `.primary-nav-item` (48x48 ikon kareler, hover/active)
- `.primary-nav-item.active` (turuncu arka plan)
- `.user-chip` (alt köşede avatar + isim)
- `.secondary-sidebar` (260px, secondary nav + liste)
- `.secondary-nav` (alt menü öğeleri, açılır/kapanır grup)
- `.secondary-nav-group` (Yönetim, Uygulamalar — açılır)
- `.secondary-nav-link` (alt menü linkleri)
- `.secondary-nav-link.active` (turuncu kenarlık/soluk vurgu)
- `.top-bar-tabs` (yatay sekme butonları)
- `.top-bar-tab` (pill-style, aktif olan turuncu)
- `.theme-toggle` (ay/güneş ikonu)
- `.page-header` (büyük başlık + alt başlık + sağ aksiyonlar)
- `.toolbar` (arama, yenile, CTA)
- `.data-table` (full-width, zebra satırlar)
- `.data-table th` (sıralama oku, hover)
- `.data-table tr:hover` (vurgu)
- `.row-actions` (3 ikon, hover'da belirgin)
- `.status-pill` (oval badge, AKTİF)
- `.table-footer` (sayfa başına, toplam, pagination)
- `.page-size-select` (dropdown)
- `.pagination` (Geri, sayfa numaraları, İleri)
- `.drawer` (sağdan slide-in, 480px)
- `.drawer-overlay` (geri kalanı karartır)
- `.empty-state` (tablo boş iken)

**Responsive:**
- `<1100px`: Primary sidebar 64px'e küçülür (sadece ikon)
- `<900px`: Secondary sidebar gizlenir (drawer olarak açılır)
- `<640px`: Primary sidebar gizlenir, hamburger menü

### 5.3. `internal/api/frontend/app.js` (Büyük Yeniden Yazım)

**State:**
```js
var state = {
    organizations: [],
    activeOrgId: null,
    tableSort: { key: 'name', dir: 'asc' },
    tablePage: 1,
    tablePageSize: 5,
    searchQuery: '',
    currentTab: 'overview',  // 'overview' | 'devices' | 'settings'
    drawerOpen: false,
    currentStatus: 'idle'
};
```

**Yeni Fonksiyonlar:**
| Fonksiyon | Görev |
|---|---|
| `renderTable()` | `state.organizations`'ı sıralar, filtreler, sayfalar, `<tbody>`'ye basar |
| `sortBy(key)` | Sıralama yapar, başlık oklarını günceller |
| `searchOrgs(q)` | Client-side filtre |
| `changePageSize(n)` | Sayfa başına kayıt |
| `goToPage(n)` | Sayfa değiştir |
| `renderPagination()` | Footer'daki Geri/İleri + sayfa numaraları |
| `selectRow(id)` | Satırı seçili yapar + drawer açar |
| `openDrawer(orgId)` | Sağdan drawer açar, formu doldurur |
| `closeDrawer()` | Drawer'ı kapatır |
| `viewOrg(id)` | Drawer'ı görüntüleme modunda açar (readonly) |
| `editOrg(id)` | Drawer'ı düzenleme modunda açar |
| `deleteOrg(id)` | Onay dialog'u + API silme |
| `switchTab(name)` | Tab sekmelerini değiştirir, ilgili içeriği gösterir |
| `toggleTheme()` | Şimdilik sadece class toggle (ileride 2 tema) |
| `toggleNavGroup(groupId)` | Açılır menü grupları (Yönetim, Uygulamalar) |

**Korunan Fonksiyonlar:**
- `api()` — HTTP helper
- `logEntry()` / `showToast()` — log & toast
- `formatUptime()` — uptime formatlama
- `checkHealth()` — health check
- `pollStatus()` — durum polling (drawer içindeki badge'leri günceller)
- `startSimulation()` / `stopSimulation()` — config'i drawer'dan okur
- `loadConfigIntoForm()` / `collectConfig()` — form-data dönüşümü

**Silinen Fonksiyonlar:**
- `renderOrgList()` (sidebar listesi) — yerini tablo alır
- Sidebar toggle'lar

**Yeni Event Binding'ler:**
- `tabOverviewBtn`, `tabDevicesBtn`, `tabSettingsBtn` → `switchTab()`
- `themeToggleBtn` → `toggleTheme()`
- `searchInput` → `searchOrgs()`
- `pageSizeSelect` → `changePageSize()`
- `pagination` butonları → `goToPage()`
- `table thead` (event delegation) → `sortBy()`
- `tbody` (event delegation) → `selectRow()` / `viewOrg()` / `editOrg()` / `deleteOrg()`
- `btnRefresh` → `fetchOrganizations()`
- Drawer kapatma butonu + overlay tıklama

### 5.4. Backend Değişiklik (İSTEĞE BAĞLI)

Yeni eklenebilecek endpoint'ler (görselde "İşlemler" için):
- `DELETE /api/organizations/:id` → Mevcut **silme endpoint'i yok**. Görselde çöp ikonu var → eklemek gerek.

| Endpoint | Method | Görev |
|---|---|---|
| `/api/organizations` | GET | (mevcut) Listele |
| `/api/organizations` | POST | (mevcut) Oluştur |
| `/api/organizations/:id` | DELETE | **YENİ** — tenant sil |
| `/api/organizations/:id` | GET | **OPSİYONEL** — tekil detay |

Yeni endpoint için `internal/api/organizations.go` dosyasına `handleDeleteOrganization` eklenir. ChirpStack gRPC `TenantService.Delete()` çağrılır.

**Route kayıtları:** `internal/api/server.go` içindeki `mux.HandleFunc(...)` satırları güncellenir.

## 6. Görsel Eşleme Tablosu

| Referans Görsel | Mevcut Yapı | Yeni Konum |
|---|---|---|
| 📡 Falt SaaS logosu | Sidebar üst (📡 ChirpStack) | Primary sidebar üst |
| Dashboard ikonu | Yok | Primary sidebar (en üst nav item) |
| ⚡ Cihazlar | Yok | Primary sidebar 2. nav item |
| ⚙ Ayarlar | Yok | Primary sidebar 3. nav item |
| Genel Bakış sekmesi | Yok | Top bar (1. tab) |
| Cihazlar sekmesi | Yok | Top bar (2. tab) |
| Ayarlar sekmesi | Yok | Top bar (3. tab) |
| 🌙 tema toggle | Yok | Top bar (sağ üst) |
| Organizasyonlar başlık + sayaç | Sidebar üst kısım | Page header |
| "Yeni Organizasyon Ekle" CTA | Top bar sağ | Page header sağ |
| Arama kutusu | Yok | Page header toolbar |
| Yenile butonu | Yok | Page header toolbar |
| Organizasyon tablosu | Yok (form vardı) | Ana içerik (tablo) |
| AKTİF rozeti | Sidebar renk | Tablodaki Durum sütunu |
| ID (kısaltılmış) | Sidebar meta | Tablodaki ID sütunu |
| Göz/pencere/çöp ikonları | Yok | Tablodaki İşlemler sütunu |
| Sayfa başına 5 | Yok | Tablo altı footer |
| Toplam 6 Organizasyon | Yok | Tablo altı footer |
| Geri/1/2/İleri | Yok | Tablo altı footer |
| Sistem Yöneticisi chip | Yok (version-info) | Primary sidebar alt köşe |

## 7. Uygulama Sırası

1. **Plan onayı** — Bu dosyanın user tarafından onaylanması.
2. **CSS değişkenlerini ve yeni layout sınıflarını hazırla** — `style.css`'in başına yeni `:root` değişkenleri + `.primary-sidebar`, `.secondary-sidebar`, `.top-bar-tabs`, `.data-table` temel tanımları.
3. **`index.html` tamamen yeniden yaz** — Yeni layout + tablo + drawer + tab içerikleri.
4. **`app.js` state machine'i güncelle** — `state` objesi, `renderTable()`, `sortBy()`, `searchOrgs()`, `changePageSize()`, `goToPage()`.
5. **Drawer + tab event binding'leri** — `openDrawer()`, `closeDrawer()`, `selectRow()`, `switchTab()`.
6. **Backend: `DELETE /api/organizations/:id`** — Görseldeki çöp ikonu için. (Bu adım atlanırsa JS'de sadece frontend tarafında uyarı verilir.)
7. **Responsive** — `@media` kuralları.
8. **Docker build + UI doğrulama** — `docker compose build` + tarayıcıda test.

## 8. Doğrulama Kriterleri

- [ ] Sayfa yüklendiğinde primary sidebar (logo + nav) ve secondary sidebar (alt menü) görünüyor.
- [ ] Top bar'da 3 sekme (Genel Bakış/Cihazlar/Ayarlar) tıklanabilir ve içerik değişiyor.
- [ ] Ana içerikte Organizasyonlar tablosu var ve tüm satırlar ChirpStack'ten gelen gerçek tenant verisi.
- [ ] Tablo sıralama (başlığa tıklayınca) çalışıyor.
- [ ] Arama kutusu client-side filtreleme yapıyor.
- [ ] "Yeni Organizasyon Ekle" modalı açılıyor ve yeni tenant ChirpStack'te oluşuyor.
- [ ] Sayfalama (Geri/İleri, sayfa numarası, sayfa başına) çalışıyor.
- [ ] Tablo altı "Toplam: N Organizasyon" doğru sayıyı gösteriyor.
- [ ] Satıra tıklayınca sağdan drawer açılıyor ve form organizasyonun tenant_id'si ile dolu.
- [ ] Drawer içinde Başlat/Durdur çalışıyor.
- [ ] Tema toggle (şimdilik sadece görsel) tıklanabilir.
- [ ] 1100px, 900px, 640px altında responsive düzen bozulmuyor.

## 9. Notlar & Kısıtlar

- **Görsel referans** Falt SaaS uygulamasına ait; bazı öğeler (Canlı Konsol, Güvenlik & Yetki, Ağ Geçitleri, Varlık Profilleri vb.) ChirpStack Simulator kapsamında değil. Bunlar **placeholder link** olarak bırakılacak, tıklanamaz ve "Yakında" rozeti ile işaretlenecek.
- **Cihazlar sekmesi** için ayrı bir `/api/devices` endpoint'i gerekebilir; mevcut API'de yoksa placeholder tablo gösterilecek.
- **Ayarlar sekmesi** mevcut `/api/health` ve config bilgilerini gösterecek.
- Tüm değişiklikler sadece frontend + isteğe bağlı bir backend endpoint'i. Core simülatör mantığına dokunulmayacak.
- Mevcut `plans/ui-redesign-plan.md` (eski plan) ile çakışma olabilir; bu yeni plan **onun yerini alır**.

## 10. Mermaid — Hedef Mimari

```mermaid
flowchart TB
    subgraph Browser [Tarayıcı]
        subgraph State [In-Memory State]
            Orgs[organizations[]]
            ActiveID[activeOrgId]
            Sort[tableSort]
            Page[tablePage]
            Search[searchQuery]
            Tab[currentTab]
            Drawer[drawerOpen]
        end

        subgraph Layout [Layout]
            P1[.primary-sidebar<br/>logo + nav]
            P2[.secondary-sidebar<br/>alt menü + liste]
            P3[.top-bar<br/>tabs + actions]
            P4[.main<br/>tablo + drawer]
        end

        Table[renderTable<br/>sort + filter + paginate]
        Form[drawer form<br/>start/stop config]
    end

    subgraph Server [Go Backend :9002]
        OrgAPI[GET/POST /api/organizations<br/>DELETE /api/organizations/:id]
        StatusAPI[GET /api/status]
        HealthAPI[GET /api/health]
        SimState[Singleton SimState]
    end

    P1 -->|nav click| Tab
    P2 -->|secondary nav| Tab
    P3 -->|tab click| Tab
    Tab --> Table
    Search --> Table
    Sort --> Table
    Page --> Table
    Table --> P4
    P4 -->|row click| Drawer
    Drawer --> Form
    Form -->|POST /api/start| StatusAPI
    Table -->|GET list| OrgAPI
    Table -->|DELETE| OrgAPI
    StatusAPI --> SimState
```
