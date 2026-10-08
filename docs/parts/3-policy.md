# Parça 3 — `policy/` (OPA)

> v1.0 · 2026-10-08 · Onaylandı

**Tek öğrenme hedefi:** Yetki kararını uygulama kodundan ayırmak: kural Rego'da durur, kod sadece sorar.

**Firmadaki karşılığı:** "Kim ne yapabilir" kuralı değiştiğinde servisler yeniden deploy edilmez; policy değişir.

**Bitti ölçütü:** Aşağıdaki iki tablodaki her satır için bir test var ve `opa test` hepsini geçiriyor. Bu parça için hiç uygulama kodu gerekmez.

## Araçlar

| Araç | Not |
|---|---|
| OPA | 1.0 veya üstü. `opa` CLI ile yazılır ve test edilir |
| Image | `openpolicyagent/opa`, sabit sürüm tag'i ile (`latest` değil) |

## Yapı

```
policy/
  ticket/
    authz.rego          Kurallar
    authz_test.rego     Testler
```

## Adımlar

| # | Adım |
|---|---|
| 1 | Sadece default deny yaz. Tek test: boş input reddedilir |
| 2 | `route_allowed` kararını yaz: rol ve action'a bakar. Tablo A'daki her satır için bir test |
| 3 | `allowed` kararını yaz: rol, action ve ticket sahibine bakar. Tablo B'deki her satır için bir test |
| 4 | `opa test . -v` ile sonuçları, `opa test . --coverage` ile test edilmeyen satır kalıp kalmadığını gör |
| 5 | OPA'yı server modunda çalıştır, bir kararı `curl` ile sor |

## Tablo A — `route_allowed` (gateway sorar)

| Roller | Action | Beklenen |
|---|---|---|
| (yok) | herhangi biri | deny |
| `requester` | `ticket:open` | allow |
| `requester` | `ticket:submit` | allow |
| `requester` | `ticket:read` | allow |
| `requester` | `ticket:approve` | deny |
| `requester` | `ticket:reject` | deny |
| `reviewer` | `ticket:approve` | allow |
| `reviewer` | `ticket:reject` | allow |
| `reviewer` | `ticket:read` | allow |
| `reviewer` | `ticket:open` | deny |
| `reviewer` | `ticket:submit` | deny |
| herhangi biri | tanımsız bir action | deny |

## Tablo B — `allowed` (server sorar, 5. adım)

`u1` ticket'ı açan kişi, `u2` başka biri.

| Kim | Roller | Action | Beklenen | Kural |
|---|---|---|---|---|
| `u1` | `requester` | `ticket:submit` | allow | P3 |
| `u2` | `requester` | `ticket:submit` | deny | P3 |
| `u2` | `reviewer` | `ticket:approve` | allow | P4 |
| `u1` | `requester`, `reviewer` | `ticket:approve` | deny | P4 istisnası |
| `u1` | `requester`, `reviewer` | `ticket:reject` | deny | P4 istisnası |
| `u1` | `requester` | `ticket:read` | allow | P5 |
| `u2` | `requester` | `ticket:read` | deny | P5 |
| `u2` | `reviewer` | `ticket:read` | allow | P5 |
| herhangi biri | herhangi biri | `resource` gönderilmemiş | deny | P1 |

## Düşünme soruları

- Rego'da bir kuralın "false" olması ile "undefined" olması aynı şey mi? Default deny hangisini çözüyor?
- Tablo B'nin son satırı neden var? `resource` eksikken "kendi ticket'ı değil" koşulu nasıl sonuç verir?
- Yeni bir rol eklenirse kaç dosya değişir? Uygulama kodu değişir mi?

## Bilinen tuzaklar

| Tuzak | Açıklama | Kaynak |
|---|---|---|
| Eski Rego yazımı | OPA 1.0'dan itibaren gövdesi olan kural `if` ister. `allow { ... }` biçimi derlenmez; eski yazıların çoğu bu biçimdedir | OPA, v0 upgrade |
| Container'da erişilemiyor | OPA 1.0'dan itibaren varsayılan olarak `localhost`'a bağlanır. Container içinde `--addr=0.0.0.0:8181` verilmezse dışarıdan ulaşılamaz | OPA, v0 upgrade; Docker deploy |
| Undefined karar | Sorulan karar undefined ise OPA yine HTTP 200 döner, cevapta `result` alanı olmaz. Çağıran taraf `result` yoksa reddetmelidir | OPA, REST API |
| Test adı | Sadece `test_` ile başlayan kurallar test olarak çalışır | OPA, Policy testing |
| FAIL ve ERROR farkı | Test kuralı undefined ya da `true` değilse FAIL; değerlendirme sırasında runtime hatası olursa ERROR | OPA, Policy testing |
| `debug` log seviyesi | Request ve response gövdelerini loglar; geliştirmede faydalı, production'da pahalı | OPA, Docker deploy |

## Nasıl sorulur

`POST /v1/data/<package yolu>/<karar adı>`, gövdede `input` anahtarı altında TICKET.md'deki input. Cevap `result` anahtarında gelir. (OPA, REST API)

## Kaynaklar

REFERENCES.md, "Policy" bölümü.
