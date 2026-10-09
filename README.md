# ticket-platform

Go gateway + OPA authorization + onion architecture server (Node.js / TypeScript).
Tamamı Terraform ile local'de ayağa kalkar. Örnek domain: ticket.


## Parçalar

| # | Klasör | Öğrenme hedefi | Durum |
|---|---|---|---|
| 1 | `infra/` | Terraform: provider, variable, state, module | Bitti (2026-10-08) |
| 2 | `server/` | Onion ve dependency inversion | Bekliyor |
| 3 | `policy/` | Kararı koddan ayırmak (OPA) | Bekliyor |
| 4 | `gateway/` | Reverse proxy ve middleware zinciri | Bekliyor |

## Dokümanlar

- [docs/DECISIONS.md](docs/DECISIONS.md): kurallar ve kararlar
- [docs/TICKET.md](docs/TICKET.md): dört parçanın uyduğu ortak sözleşme
- [docs/REFERENCES.md](docs/REFERENCES.md): kararların dayandığı kaynaklar
- [docs/parts/](docs/parts/): parça başına adımlar ve bitti ölçütleri
