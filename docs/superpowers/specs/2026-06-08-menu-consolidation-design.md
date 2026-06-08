# Menu Consolidation: Tek Sidebar'a Geçiş

## 1. Sorun

Mevcut UI'da iki ayrı menü sistemi var:
- **Birincil sidebar (72px)**: Sadece 3 ikonlu öğe (Genel Bakış, Cihazlar, Ayarlar)
- **İkincil sidebar (256px)**: Tam menü yapısı (iofeSaaS logosu, Yönetim, Uygulamalar, vb.)
- **Üst çubuk**: Birincil sidebar ile aynı 3 sekme tekrar ediyor

Bu durum kafa karışıklığı yaratıyor ve gereksiz yer kaplıyor.

## 2. Çözüm

Birincil sidebar'ı tamamen kaldır, ikincil sidebar'ı tek ana menü yap, üst çubuktaki tekrar eden sekmeleri sil.

## 3. Yap Değişiklikleri

### 3.1. Kaldırılacak HTML
- `<aside class="primary-sidebar" id="primary-sidebar">` — tam blok (satır 12-43)
- Üst çubuktaki `.top-bar-tabs` içeriği (satır 186-196)

### 3.2. Yeni Üst Çubuk Yapısı
```
[top-bar-left]
  [hamburger-btn] — mobilde sidebar'ı açar
  [sayfa başlığı] — aktif menü öğesine göre değişir
[top-bar-right]
  [connection-badge] [status-badge] [uptime-badge] [theme-toggle]
```

### 3.3. Korunacak HTML
- `<aside class="secondary-sidebar">` — aynen kalır
- Tüm menü öğeleri (Yönetim, Uygulamalar, vb.) — aynen kalır

## 4. CSS Değişiklikleri

### Silinecek Sınıflar
- `.primary-sidebar`, `.primary-sidebar-header`, `.primary-sidebar-logo`, `.primary-sidebar-brand`
- `.primary-nav`, `.primary-nav-item`, `.primary-nav-item.active`
- `.primary-sidebar.expanded` ve tüm varyasyonları
- `.sidebar-toggle-btn`, `.toggle-icon-expand`, `.toggle-icon-collapse`
- `.nav-label`, `.primary-nav-item .nav-label`
- `.user-chip`, `.user-avatar`, `.user-info`
- `.primary-sidebar-footer`
- Tooltip stilleri (`.primary-nav-item[data-tooltip]:hover::after`)
- Responsive kurallardaki primary-sidebar blokları

### Güncellenecek Sınıflar
- `.top-bar-left`: hamburger + sayfa başlığı için
- `.top-bar`: tab'lar kaldırıldığı için sadeleştirilecek

## 5. JavaScript Değişiklikleri

### Kaldırılacak Referanslar
- `primarySidebar`, `sidebarToggleBtn`
- `navOverview`, `navDevices`, `navSettings`
- `togglePrimarySidebar()`, `restoreSidebarState()`
- `sidebar-toggle-btn` event binding

### Güncellenecek Fonksiyonlar
- `switchTab()`: Primary sidebar nav güncelleme satırları kaldırılacak (sadece top-bar badge güncelleme kalacak)
- `init()`: `restoreSidebarState()` çağrısı kaldırılacak

### Yeni Eklenecek
- `updatePageTitle()`: Aktif tab'a göre üst çubukta başlık gösterir

## 6. Responsive Değişiklikleri

- `@media (max-width: 1100px)`: Primary sidebar blokları kaldırılacak
- `@media (max-width: 900px)`: Hamburger butonu görünecek, secondary sidebar slide-in
- `@media (max-width: 640px)`: Primary sidebar position:fixed blokları kaldırılacak

## 7. Doğrulama Kriterleri

- [ ] Sayfa yüklendiğinde sadece tek sidebar (iofeSaaS logolu) görünüyor
- [ ] Üst çubukta tekrar eden sekmeler yok, sadece badge'ler ve tema toggle var
- [ ] Hamburger butonu mobilde sidebar'ı açıp kapatıyor
- [ ] Tüm menü öğeleri (Yönetim, Uygulamalar, vb.) çalışıyor
- [ ] Sayfa başlığı aktif menü öğesine göre değişiyor
- [ ] Responsive kurallar bozulmuyor (1100px, 900px, 640px)
- [ ] Primary sidebar ile ilgili hiçbir CSS/JS kalmamış

## 8. Dosya Kapsamı

| Dosya | Değişiklik |
|-------|-----------|
| `internal/api/frontend/index.html` | Primary sidebar sil, top-bar güncelle |
| `internal/api/frontend/style.css` | Primary sidebar stilleri sil, top-bar güncelle, responsive güncelle |
| `internal/api/frontend/app.js` | Primary sidebar referansları ve fonksiyonları sil, switchTab güncelle |
