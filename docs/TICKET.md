# TICKET.md — Ortak Sözleşme

> v1.0 · 2026-10-08 · Onaylandı
>
> Dört parçanın hepsi bu dosyaya uyar. Burada bir şey değişirse önce bu dosya güncellenir, sonra kod.
> Bu dosya bir tasarım sözleşmesidir: alan adları, action adları ve header adları bizim seçimimizdir, bir standarttan gelmez.

## Ticket

| Alan | Açıklama |
|---|---|
| `id` | Server üretir |
| `title` | Boş olamaz |
| `status` | `open`, `in_review`, `approved`, `rejected` |
| `openedBy` | Ticket'ı açan kullanıcının id'si |
| `decidedBy` | Onaylayan ya da reddeden kullanıcı; karar verilene kadar boş |
| `rejectReason` | Sadece `rejected` durumunda dolu |

## Durumlar

```
open ──submit──► in_review ──approve──► approved
                           └─reject───► rejected
```

## Kurallar

### Durum kuralları → `server/` domain katmanı

| # | Kural |
|---|---|
| S1 | `title` boş olamaz |
| S2 | `submit` sadece `open` durumunda yapılır |
| S3 | `approve` ve `reject` sadece `in_review` durumunda yapılır |
| S4 | `reject` bir sebep ister |
| S5 | `approved` ve `rejected` son durumdur; ticket bir daha değişmez |

### Yetki kuralları → `policy/` (OPA)

| # | Kural |
|---|---|
| P1 | Açıkça izin verilmeyen her şey reddedilir (default deny) |
| P2 | `requester` rolü ticket açabilir |
| P3 | Bir ticket'ı sadece onu açan kişi `submit` edebilir |
| P4 | `reviewer` rolü `approve` ve `reject` yapabilir; **kendi açtığı ticket hariç** |
| P5 | Bir ticket'ı onu açan kişi ve `reviewer` rolündekiler okuyabilir |

Bir kullanıcı iki role birden sahip olabilir; P4'teki istisna bu yüzden var.

## Endpoint'ler

| Method + path | Action adı | Başarı |
|---|---|---|
| `POST /tickets` | `ticket:open` | 201 |
| `GET /tickets/{id}` | `ticket:read` | 200 |
| `POST /tickets/{id}/submit` | `ticket:submit` | 200 |
| `POST /tickets/{id}/approve` | `ticket:approve` | 200 |
| `POST /tickets/{id}/reject` | `ticket:reject` | 200 |

## Hata kodları

| Kod | Ne zaman | Kim döner |
|---|---|---|
| 400 | Girdi geçersiz (S1, S4) | Server |
| 401 | Token yok ya da geçersiz | Gateway |
| 403 | Token geçerli ama policy izin vermedi | Gateway (5. adımdan sonra server da) |
| 404 | Ticket yok | Server |
| 409 | İşlem ticket'ın şu anki durumuyla çelişiyor (S2, S3, S5) | Server |

401 ile 403 ayrımı: 401 geçerli kimlik bilgisi olmadığında, 403 kimlik geçerli ama izin olmadığında döner. 409 ise isteğin kaynağın mevcut durumuyla çeliştiğini söyler. (Kaynak: MDN, RFC 9110'a dayanarak.)

## Kimlik

**Token (JWT) claim'leri**

| Claim | İçerik |
|---|---|
| `sub` | Kullanıcı id'si |
| `roles` | Rol listesi: `requester`, `reviewer` |
| `iss`, `aud`, `exp` | Kim imzaladı, kimin için, ne zamana kadar geçerli |

**Gateway'den server'a**

| Header | İçerik |
|---|---|
| `X-User-Id` | Doğrulanmış token'daki `sub` |
| `X-User-Roles` | Doğrulanmış token'daki `roles` |

Server bu header'lara güvenir. Bunun tek dayanağı, 5. adımdan sonra server'a host'tan doğrudan erişilememesidir.

## OPA'ya gönderilen input

İki ayrı karar vardır, iki ayrı isimle sorulur.

| Karar | Kim sorar | Input |
|---|---|---|
| `route_allowed` | Gateway | `subject` (`id`, `roles`) + `action` |
| `allowed` | Server (5. adım) | `subject` + `action` + `resource` (`openedBy`) |

Neden tek karar değil: tek bir `allow` kuralında `resource` gelmediğinde P4'teki "kendi ticket'ı değilse" koşulu yanlışlıkla doğru sayılabilir ve kural izin verir. İki ayrı isim, gateway'in sahiplik gerektiren karara hiç dokunmamasını sağlar. (Tasarım tercihi; bir standarttan gelmez.)
