# Pasif Mod (Passive Mode) Özelliği — Kısa Özet

Bu plan `implementation_plan.md` dosyasının workspace içindeki kopyasıdır.

## Değişecek Dosyalar (8 dosya, ~150 satır)

| Dosya | Değişiklik |
|-------|------------|
| `internal/config/config.go` | `PassiveMode bool` alanı ekle |
| `internal/api/store.go` | `StartRequest`'e `PassiveMode bool` ekle |
| `internal/simulator/simulator.go` | struct + setupGateways/tearDownGateways |
| `internal/api/simulation.go` | buildConfigFromList aktarım + validasyon |
| `internal/api/bootstrap.go` | Varsayılan `PassiveMode: false` |
| `internal/api/frontend/src/drawer.html` | Toggle + koşullu GW count alanı |
| `internal/api/frontend/js/tabs/orgs.js` | Form toggle mantığı |
| `internal/api/frontend/js/tabs/gateways.js` | Pasif modda "Yeni Geçit" gizle |

## Kritik Sorular (Onay Bekleniyor)
1. Pasif modda GW-cihaz eşleşmesi nasıl yapılsın? (Havuzdan rastgele önerilir)
2. Pasif modda 0 GW varsa ne olsun? (Hata mesajı önerilir)
