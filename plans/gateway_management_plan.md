# ChirpStack Simülatör Geçitler (Gateways) Özelliği Uygulama Planı

Bu plan, simülatör yönetim paneline "Geçitler" (Gateways) sekmesini ekleyerek kullanıcıların ChirpStack üzerindeki geçitleri listelemesini, yeni geçit eklemesini ve silmesini sağlayacak geliştirmeleri tanımlar.

---

## 1. Backend Değişiklikleri

### A. Yeni API Uçları (`internal/api/gateways.go`)
Yeni bir backend dosyası oluşturularak aşağıdaki HTTP işleyicileri tanımlanacaktır:
* `handleListGateways(w, r)`: ChirpStack API'sinden belirtilen `tenant_id` altındaki geçitleri listeler. Eğer `tenant_id` seçilmemişse tüm organizasyonlardaki geçitleri listeler.
* `handleCreateGateway(w, r)`: ChirpStack API'sini kullanarak yeni bir gateway kaydeder.
* `handleDeleteGateway(w, r, id)`: ChirpStack API'sini kullanarak belirtilen gateway'i siler.

### B. Rota Tanımlamaları (`internal/api/server.go`)
Aşağıdaki API rotaları sisteme eklenecektir:
* `GET /api/gateways`
* `POST /api/gateways`
* `DELETE /api/gateways/{id}`

---

## 2. Frontend Değişiklikleri

### A. Şablon Yapısı (`internal/api/frontend/src/tabs/gateways.html`)
Diğer yönetim tabloları ile uyumlu olarak şu yapıyı içerecektir:
* Geçit Adı, Gateway ID (EUI64), Organizasyon (Tenant) ve Oluşturma Tarihi kolonlarını gösteren veri tablosu.
* Arama çubuğu, Organizasyon filtresi ve "Yeni Geçit" butonu.
* Sayfalama (Pagination) bileşeni.

### B. Kontrolcü Mantığı (`internal/api/frontend/js/tabs/gateways.js`)
* Listeyi API'den çekme, arama/filtreleme, tabloyu güncelleme mantığı.
* "Yeni Geçit" modal formunun gönderimini yönetme.
* "Sil" aksiyonları için onay kutusu ve silme API isteklerini yönetme.

### C. Sidebar & Layout Güncellemeleri
* **sidebar.html**: "Yönetim" başlığı altına "Geçitler" sekmesi eklenecektir.
* **layout.html**: `{{TAB_GATEWAYS}}` şablon yer tutucusu eklenecektir.
* **modals.html**: Yeni geçit ekleme form modali (`#gw-modal-form`) eklenecektir.
* **translate.js**: İlgili tüm yerelleştirme (TR/EN) anahtarları eklenecektir.
* **build.py**: `{{TAB_GATEWAYS}}` yer tutucusunu derleme sürecine dahil edecek şekilde güncellenecektir.

---

## 3. Doğrulama ve Test Planı
* `internal/api/gateways_test.go` dosyası oluşturularak birim testleri (GET, POST, DELETE hata ve başarı durumları) eklenecektir.
* `build.py` çalıştırılarak derleme doğrulanacaktır.
* Arayüz üzerinden geçit listeleme, ekleme ve silme akışları test edilecektir.
