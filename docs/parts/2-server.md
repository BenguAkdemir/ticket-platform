# Parça 2 — `server/` (Node.js + TypeScript)

> v1.0 · 2026-10-08 · Onaylandı

**Tek öğrenme hedefi:** Onion architecture ve dependency inversion: iş kuralı merkezde durur, database ve HTTP ona bağlanır; tersi olmaz.

**Firmadaki karşılığı:** Database ya da framework değişse bile iş kuralı kodu değişmez ve database olmadan test edilir.

**Bitti ölçütü:**
1. TICKET.md'deki beş endpoint çalışıyor ve S1–S5 kuralları testle kanıtlı.
2. Repository in-memory'den PostgreSQL'e geçerken `application/` klasöründe tek satır değişmedi. `domain/`'e yalnızca kayıttan nesne kurma (`Ticket.restore`) eklendi; hiçbir kural değişmedi ve `domain/` hâlâ hiçbir şeyi import etmiyor.
3. `domain/` klasöründe `express` ya da `pg` import'u yok.

## Araçlar

| Araç | Not |
|---|---|
| Node.js | 24 (LTS). `.ts` dosyasını build adımı olmadan çalıştırır |
| TypeScript | 5.8 veya üstü; sadece type checking için (`tsc --noEmit`) |
| Express | 5 |
| `pg` | PostgreSQL client |
| `node:test` | Node.js'in kendi test runner'ı; ek test kütüphanesi yok |

## Katmanlar

```
server/src/
  domain/           Ticket, durum kuralları, hata tipleri, repository interface'i
  application/      Use case'ler: aç, submit et, onayla, reddet, getir
  infrastructure/   Repository'nin in-memory ve PostgreSQL implementasyonları
  http/             Express route'ları, hata → status code çevirisi
  main.ts           Composition root: her şeyin birbirine bağlandığı tek yer
```

**Bağımlılık kuralı:** bir katman sadece kendinden içerideki katmanı import edebilir.

| Katman | Import edebilir | Import edemez |
|---|---|---|
| `domain/` | Hiçbir şey | Diğer hepsi, `express`, `pg` |
| `application/` | `domain/` | `infrastructure/`, `http/`, `express`, `pg` |
| `infrastructure/` | `domain/`, `application/` | `http/` |
| `http/` | `application/`, `domain/` | `infrastructure/` |
| `main.ts` | Hepsi | — |

Kilit nokta: repository'nin **interface'i** `domain/` içinde, **implementasyonu** `infrastructure/` içinde durur. (Palermo)

## Adımlar

| # | Adım | Bu adımda olmayan |
|---|---|---|
| 1 | Sadece `domain/`: `Ticket` class'ı ve S1–S5 kuralları, testleriyle | Express, database, repository |
| 2 | `application/`: use case'ler ve repository interface'i. `infrastructure/` içinde in-memory repository | Express, PostgreSQL |
| 3 | `http/` ve `main.ts`: Express route'ları, hata çevirisi, composition root | PostgreSQL |
| 4 | PostgreSQL repository. `main.ts` içinde tek satırla değiştir | Yeni iş kuralı |

Kullanıcı kimliği bu parçada `X-User-Id` header'ından okunur ve sadece `http/` katmanı bunu bilir. Yetki kontrolü bu parçada yok; 5. adımda gelir.

## Düşünme soruları

- `Ticket`'ın `status` alanı dışarıdan doğrudan değiştirilebilirse S2, S3 ve S5 kurallarını kim korur?
- Use case, repository'nin in-memory mi PostgreSQL mi olduğunu bilmeden nasıl çalışıyor? Bunu bilen tek dosya hangisi?
- `id` ve zaman bilgisi domain'e nereden girmeli ki test her çalıştığında aynı sonucu versin?
- Database'den okunan satır tekrar `Ticket` nesnesine dönerken kurallar yeniden çalışmalı mı?
- SOLID'in beş harfinden hangileri bu dört adımda somut olarak karşına çıktı, hangi dosyada?

## Bilinen tuzaklar

| Tuzak | Açıklama | Kaynak |
|---|---|---|
| Node.js type check yapmaz | Sadece type'ları siler. Hataları görmek için `tsc --noEmit` ayrıca çalıştırılır | Node.js, Modules: TypeScript |
| Parameter property çalışmaz | `constructor(private x: string)` yazımı ve `enum` ek flag ister. Alanlar class gövdesinde açıkça tanımlanır. Node.js dokümanının önerdiği tsconfig'te `erasableSyntaxOnly` açıktır | Node.js, Modules: TypeScript |
| Import'ta uzantı zorunlu | `import './ticket.ts'` yazılır; type import'u `import type` ile yapılır | Node.js, Modules: TypeScript |
| `private` runtime'da korumaz | TypeScript `private` sadece type checking sırasında geçerlidir. JavaScript `#alan` runtime'da da gizlidir | TypeScript Handbook, Classes |
| Decorator desteklenmez | Type stripping decorator'ı çalıştırmaz | Node.js, Modules: TypeScript |
| SQL'i string birleştirerek kurmak | SQL injection'a yol açar; değerler `$1`, `$2` ile parametre olarak verilir | node-postgres, Queries |
| `req` / `res` içeri sızar | Express nesneleri `http/` dışına çıkmaz | nodebestpractices 1.2 |

Express 5'te bilinmesi gereken bir kolaylık: `async` handler içinde fırlatılan hata otomatik olarak error handler'a gider. Hata → status code çevirisi bu sayede tek yerde yazılır. (Express, Migrating to 5)

## Kaynaklar

REFERENCES.md, "Mimari çekirdek" ve "Server" bölümleri.
