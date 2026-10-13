# Parça 4 — `gateway/` (Go)

> v1.1 · 2026-10-12 · Onaylandı
>
> v1.1: timeout ve shutdown 6. adımdan 2. adıma alındı; `/healthz` ve ölçüm adımı (7) eklendi; deneyler ve yeni tuzaklar eklendi.

**Tek öğrenme hedefi:** Reverse proxy ve middleware zinciri: bir request server'a ulaşmadan önce sırayla hangi kontrollerden geçer.

**Firmadaki karşılığı:** Kimlik doğrulama ve yetki kontrolü her serviste ayrı ayrı yazılmaz; tek giriş noktasında yapılır.

**Bitti ölçütü:** Aşağıdaki "Kabul testleri" tablosundaki her satır beklenen sonucu veriyor.

## Araçlar

| Araç | Not |
|---|---|
| Go | 1.22 veya üstü (method ve wildcard içeren route pattern'leri için) |
| Standard library | `net/http`, `net/http/httputil` |
| `github.com/golang-jwt/jwt/v5` | Tek dış bağımlılık |

Router, proxy ve middleware için ek kütüphane yok; hepsi standard library ile yazılır.

## Yapı

```
gateway/
  cmd/
    gateway/      main: her şeyin bağlandığı yer
    devtoken/     Test token'ı imzalayan küçük komut
  internal/       Config, middleware'ler, OPA client, proxy
```

`internal/` altındaki paketler başka module'ler tarafından import edilemez. (Go, Organizing a Go module)

## Request'in yolu

```
request
  → request ID ve log
  → JWT doğrulama            başarısızsa 401
  → OPA'ya route_allowed     izin yoksa 403
  → kimlik header'larını yaz
  → reverse proxy → server
```

## Adımlar

| # | Adım |
|---|---|
| 1 | Düz reverse proxy: gelen her request'i server'a ilet (`httputil.ReverseProxy`, `Rewrite`). Gateway'in kendi `/healthz` endpoint'i |
| 2 | `http.Server` timeout'ları ve graceful shutdown. Deney: Slowloris |
| 3 | Middleware zinciri: request ID üret, her request için tek satır structured log (`log/slog`). İlk testler `net/http/httptest` ile |
| 4 | JWT doğrulama: RS256 public key ile; key başlangıçta bir kez okunur. `devtoken` komutunu yaz |
| 5 | Route → action eşlemesi (TICKET.md) ve OPA sorgusu: kısa timeout, fail-closed, `result` yoksa reddet |
| 6 | Kimlik header'ları: client'tan gelen `X-User-*` header'larını sil, doğrulanmış token'dan yeniden yaz |
| 7 | Ölçüm: yük testi ile katman başına gecikme; backend transport ayarı; 502 ve 504 ayrımı için kendi `ErrorHandler`'ın |

Timeout'lar 2. adımda, çünkü sonraki her adım güvenli varsayılanlara sahip bir server üzerinde çalışmalı.

**Durum (2026-10-13):** 1–6 bitti. 7. adım (ölçüm) Bengü'nün kararıyla Part 5'ten sonraya ertelendi; gateway ve proxy o noktada ayrıca ayrıntılı ele alınacak.

## Deneyler

| Deney | Neyi gösterir |
|---|---|
| Slowloris (`nc` ile header'ı bitmeyen bağlantı) | Timeout yokken bağlantı açık kalır; `ReadHeaderTimeout` ile kapanır |
| Katman başına gecikme (yük testi aracı) | Düz proxy, + JWT, + OPA: her katmanın maliyeti. Sayılar tahmin edilmez, ölçülür |
| Bağlantı havuzu | Varsayılan transport ile `MaxIdleConnsPerHost` yükseltilmiş transport arasındaki fark |

## Kabul testleri## Kabul testleri

| Durum | Beklenen |
|---|---|
| Token yok | 401 |
| Süresi dolmuş token | 401 |
| Başka algoritmayla (HS256) imzalanmış token | 401 |
| `aud` ya da `iss` yanlış | 401 |
| `requester` → `POST /tickets/{id}/approve` | 403 |
| `reviewer` → `POST /tickets/{id}/approve` | Request server'a ulaşır |
| Client kendi `X-User-Id` header'ını gönderir | Server'a token'daki `sub` gider, client'ın yazdığı değil |
| OPA kapalı | Request server'a ulaşmaz; gateway 5xx döner |
| Server kapalı | 502 |

## Düşünme soruları

- Middleware'lerin sırası değişirse ne bozulur? Örneğin OPA sorgusu JWT doğrulamadan önce gelirse?
- OPA'ya ulaşılamadığında "izin ver" ile "reddet" arasında neden ikincisi seçilir?
- Gateway `X-User-Id` header'ını silmezse hangi saldırı mümkün olur?
- Private key gateway'de olsaydı ve gateway ele geçirilseydi ne olurdu?

## Bilinen tuzaklar

| Tuzak | Açıklama | Kaynak |
|---|---|---|
| `Director` | Deprecated. Yerine `Rewrite` kullanılır; eski yazıların çoğu hâlâ `Director` gösterir | Go, `net/http/httputil` |
| `X-Forwarded-*` | `Rewrite` çağrılmadan önce bu header'lar silinir; gerekiyorsa `SetXForwarded` ile yeniden yazılır. Kendi `X-User-*` header'ların bu temizliğe dahil değildir, onları sen silersin | Go, `net/http/httputil` |
| Algoritma kontrolü | Kabul edilen algoritma açıkça verilir (`WithValidMethods`). Kütüphane dokümanı bunu saldırıları önlemek için "heavily encouraged" sayar | golang-jwt v5; RFC 8725 §3.1 |
| `exp` zorunlu değildir | Token'da `exp` claim'i hiç yoksa kütüphane varsayılan olarak bunu hata saymaz; `WithExpirationRequired` ile zorunlu yapılır | golang-jwt v5 |
| `iss` ve `aud` | Doğrulanmaları ayrıca istenmelidir | golang-jwt v5; RFC 8725 §3.8, §3.9 |
| Timeout yok | `http.Server` alanlarında (`ReadTimeout`, `ReadHeaderTimeout`, `WriteTimeout`, `IdleTimeout`) sıfır değer "timeout yok" demektir | Go, `net/http` kaynak kodu |
| Shutdown | `Shutdown` çağrıldığında `ListenAndServe` hemen döner; program `Shutdown` bitene kadar beklemezse açık request'ler kesilir | Go, `net/http` kaynak kodu |
| OPA'da `result` yoksa | Undefined karar HTTP 200 ve boş cevap olarak gelir; bu "izin" değildir | OPA, REST API |
| Varsayılan `ErrorHandler` | Her backend hatasında 502 döner; backend'in kapalı olması ile cevap vermemesi ayırt edilmez | Go, `net/http/httputil` kaynak kodu |
| Bağlantı havuzu | `ReverseProxy` varsayılan olarak `http.DefaultTransport` kullanır; host başına boşta tutulan bağlantı sayısı `DefaultMaxIdleConnsPerHost = 2` | Go, `net/http` kaynak kodu |
| Body'yi okumak | Proxy body'yi stream eder. Middleware'de `io.ReadAll` her request'i belleğe alır; gateway body'ye dokunmaz | Go, `net/http/httputil` |
| Token'ı loglamak | `Authorization` header'ı log'a yazılmaz; log'a erişen token'ı kullanabilir | Tasarım tercihi |

## Kapsam dışı

TLS termination · load balancing · service discovery · rate limiting · response birleştirme (BFF) · token üretimi için gerçek bir identity provider.

## Kaynaklar

REFERENCES.md, "Gateway" ve "Policy" bölümleri.
