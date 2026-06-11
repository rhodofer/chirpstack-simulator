# 📋 Canlı Telemetri Konsolu — Durum Analizi ve Uygulama Planı

---

## 🔴 MEVCUT DURUM ANALİZİ

### Bulgular

Canlı Telemetri Konsolu özelliği **planlanmış ancak hiçbir zaman uygulanmamıştır.**

| Katman | Durum | Detay |
|:---|:---|:---|
| **Plan Dokümanı** | ✅ Mevcut | [`docs/telemetri_konsol_plani.md`](docs/telemetri_konsol_plani.md) dosyası 68 satırlık detaylı bir plan içeriyor |
| **Backend `/ws/live` Endpoint** | ❌ Eksik | [`ws.py`](backend/api/v1/endpoints/ws.py:13) dosyasında sadece `/{device_id}` rotası var, global `/live` rotası hiç eklenmemiş |
| **Backend Tenant WS Manager** | ❌ Eksik | [`manager.py`](backend/modules/websocket/manager.py:10) sadece device-bazlı `Dict[str, List[WebSocket]]` kullanıyor, tenant gruplama desteği yok |
| **Frontend Sayfa Rotası** | ❌ Eksik | `frontend/src/app/(dashboard)/telemetry-console/` dizini hiç oluşturulmamış |
| **Frontend Bileşen** | ❌ Eksik | `frontend/src/components/telemetry/TelemetryConsole.tsx` hiç yazılmamış |
| **Sidebar Bağlantısı** | ❌ Eksik | [`app-sidebar.tsx`](frontend/src/components/sidebar/app-sidebar.tsx:39) dosyasında `navItems` dizisinde "Konsol" veya "Canlı Konsol" bağlantısı yok |

### Sidebar Mevcut Menü Yapısı ([`app-sidebar.tsx`](frontend/src/components/sidebar/app-sidebar.tsx:39))

```
├── Genel Bakış          → /dashboard
├── Dashboardlar         → /dashboards
├── Yönetim (collapsible)
│   ├── Organizasyonlar  → /organizations
│   ├── Birimler         → /units
│   ├── Varlıklar        → /assets
│   └── Kullanıcı Yönetimi → /users
├── Uygulamalar (collapsible)
│   ├── Ağ Uygulamaları  → /applications
│   ├── Ağ Geçitleri     → /gateways
│   ├── Cihazlar         → /devices
│   ├── Cihaz Profilleri → /device-profiles
│   ├── Varlık Profilleri → /asset-profiles
│   └── Gruplar          → /device-groups
├── Veri & Analiz        → /analytics
└── Güvenlik & Yetki     → /security
```

**"Konsol" bağlantısı bu yapıda hiç bulunmuyor.**

---

## 🟢 UYGULAMA PLANI

### Aşama 1: Backend — Global Tenant-Based WebSocket Endpoint

**Hedef:** [`ws.py`](backend/api/v1/endpoints/ws.py) dosyasına `/ws/live` rotası eklemek.

#### 1.1 [`manager.py`](backend/modules/websocket/manager.py) Güncellemesi

`ConnectionManager` sınıfına tenant-bazlı bağlantı yönetimi eklenmeli:

```python
class ConnectionManager:
    def __init__(self) -> None:
        # Mevcut: device_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # YENİ: tenant_id -> List[WebSocket] (Canlı Konsol için)
        self.tenant_connections: Dict[str, List[WebSocket]] = {}
```

Yeni metodlar:
- `connect_tenant(websocket, tenant_id)` — Tenant grubuna WS bağlantısı ekler
- `disconnect_tenant(websocket, tenant_id)` — Tenant grubundan çıkarır
- `broadcast_to_tenant(tenant_id, message)` — Tenant grubundaki tüm client'lara yayın yapar

#### 1.2 [`ws.py`](backend/api/v1/endpoints/ws.py) Yeni Rota

```python
@router.websocket("/live")
async def live_telemetry_endpoint(
    websocket: WebSocket,
    session: AsyncSession = Depends(get_async_session),
    actor: User = Depends(get_ws_actor)
):
    """Tüm cihazlardan canlı telemetri akışı (tenant izole)."""
    # 1. get_ws_actor ile token doğrulama (mevcut deps.py altyapısı)
    # 2. actor.tenant_id değeri alınır
    # 3. manager.connect_tenant(websocket, actor.tenant_id)
    # 4. Redis Pub/Sub dinleyicisi başlatılır (tenant_id filtresiyle)
    # 5. while True: await websocket.receive_text() (keep-alive)
```

**Kritik:** [`deps.py`](backend/api/deps.py:150) dosyasındaki `get_ws_actor` fonksiyonu zaten WebSocket token doğrulamasını destekliyor — yeniden kullanılacak.

#### 1.3 Redis Pub/Sub Entegrasyonu

Mevcut [`redis_pubsub.py`](backend/modules/websocket/redis_pubsub.py) yapısı device-bazlı publish yapıyor. Tenant bazlı yayın için:

- Ingestion servisi her veri geldiğinde `tenant_id` bilgisini mesaja ekler
- `manager.broadcast_to_tenant()` çağrılır
- Tenant filtresi: Mesajdaki `tenant_id` → Sadece o tenant'a bağlı WS client'larına iletilir

---

### Aşama 2: Frontend — Konsol Sayfası ve Bileşen

#### 2.1 Sidebar Bağlantısı ([`app-sidebar.tsx`](frontend/src/components/sidebar/app-sidebar.tsx:39))

`navItems` dizisine yeni bir öğe eklenmeli:

```typescript
{
  title: 'Veri Konsolu',
  url: '/telemetry-console',
  icon: Terminal,  // lucide-react'den
}
```

**Konum:** "Dashboardlar" ile "Yönetim" arasına, veya "Veri & Analiz" altına. Mimari olarak "Veri & Analiz" grubunun altı daha uygun görünüyor — ancak mevcut sidebar yapısında "Veri & Analiz" collapsible değil, doğrudan link. Bu yüzden üst seviye bağımsız bir öğe olarak eklenmeli.

#### 2.2 Sayfa Rotası

```
frontend/src/app/(dashboard)/telemetry-console/page.tsx
```

Page-Container pattern'ine uygun olarak sadece container'ı render etmeli:

```tsx
// page.tsx — Sadece layout container'ı render eder
import { TelemetryConsoleContainer } from '@/containers/telemetry-console'

export default function TelemetryConsolePage() {
  return <TelemetryConsoleContainer />
}
```

#### 2.3 Ana Bileşen

```
frontend/src/containers/telemetry-console/index.tsx
```

**Özellikler:**
- Koyu arka plan (`bg-zinc-950`), monospace yazı tipi (`font-mono`)
- WebSocket bağlantısı: `/api/v1/ws/live?auth_token=...`
- Pause/Play kontrolü
- Temizle (Clear Logs) butonu
- Arama/Filtreleme (regex destekli)
- Maksimum 200 satır limiti
- Cihaz adına göre renk kodlu etiketler
- Zustand store: `stores/telemetry-console-store.ts` (opsiyonel, basit state ise `useTelemetryConsole` hook yeterli)

#### 2.4 WebSocket Client

Mevcut [`lib/websocket.ts`](lib/websocket.ts) dosyası incelenmeli — yeni global WS bağlantısı için genişletilmeli veya yeni bir `useTelemetryWebSocket` hook'u yazılmalı.

---

### Aşama 3: Oso Yetkilendirme

- `/ws/live` endpoint'inde `oso_service.authorize(actor, "read", "TelemetryConsole")` çağrısı yapılmalı
- Tenant izolasyonu: `actor.tenant_id` filtresi WebSocket bağlantısı boyunca korunmalı
- Cihaz seviyesinde yetki: Tüm cihazları okuma yetkisi olanroller konsolu görebilmeli (`device:read` veya `telemetry:read`)

---

### Aşama 4: Dosya Listesi

| Dosya | Tür | Açıklama |
|:---|:---|:---|
| `backend/modules/websocket/manager.py` | **Güncelleme** | Tenant-bazlı bağlantı yönetimi ekle |
| `backend/api/v1/endpoints/ws.py` | **Güncelleme** | `/ws/live` global endpoint ekle |
| `backend/tests/v1/test_websocket.py` | **Güncelleme** | Tenant izole WS testleri ekle |
| `frontend/src/components/sidebar/app-sidebar.tsx` | **Güncelleme** | "Veri Konsolu" sidebar bağlantısı ekle |
| `frontend/src/app/(dashboard)/telemetry-console/page.tsx` | **Yeni** | Konsol sayfa rotası |
| `frontend/src/containers/telemetry-console/index.tsx` | **Yeni** | Ana konsol bileşeni (terminal arayüzü) |
| `frontend/src/hooks/useTelemetryWebSocket.ts` | **Yeni** | Global WS hook'u (opsiyonel) |

---

## ⚠️ Kritik Notlar

1. **BigInt Timestamps:** Tüm WS mesajlarında `timestamp BIGINT epoch_ms` kullanılacak — asla `datetime`
2. **Multitenancy:** Bir kullanıcı sadece kendi kiracısının (tenant) verilerini görebilmeli
3. **No `create_all()`:** Yeni tablo gerekirse Alembic migration ile
4. **Loguru:** Debug loglarında `print()` değil `logger.info/debug` kullanılacak
5. **Performans:** Maksimum 200 satır limiti, AR-GE amaçlı bir araç olduğundan aggressive buffer management gerekli
