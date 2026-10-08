# REFERENCES.md — Kanıtlanmış Kaynaklar

> v1.0 · 2026-10-08 · Onaylandı
>
> **Doğrulama:** Aşağıdaki her link 2026-10-08'de açıldı ve md'lerde ona dayanan cümle içerikle karşılaştırıldı. İstisnalar "Not" sütununda yazılı.

## Seviyeler

| Seviye | Tanım | Kullanımı |
|---|---|---|
| **A** | Pattern'i tanımlayan kişi ya da aracın resmi dokümanı | Kararın dayanağı |
| **B** | Sektör kanıtı ya da güvenilir ikincil kaynak | "Gerçekten böyle mi" kontrolü |
| **C** | Community derlemesi | Sadece fikir; tek başına dayanak olamaz |

---

## Mimari çekirdek

| Kaynak | Sv. | Bize ne söylüyor | Not |
|---|---|---|---|
| Jeffrey Palermo — [The Onion Architecture: part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/) (2008) | A | Tüm coupling merkeze doğrudur. Repository interface'i çekirdekte, implementasyonu dış halkadadır. Database merkez değil, dış servistir | Yazarın sınırı: küçük siteler için uygun değil. Biz öğrenmek için bilerek uyguluyoruz |
| Alistair Cockburn — [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/) (2005) | A | Uygulama UI ve database olmadan test edilebilmeli; port amaca göre tanımlanır, adapter teknolojiye çevirir | — |
| Robert C. Martin — [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) (2012) | A | The Dependency Rule: source code dependency'leri sadece içe doğru bakar | — |
| Mark Seemann — [Composition Root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/) (2011) | A | Modüllerin birbirine bağlandığı (tercihen) tek yer; giriş noktasına olabildiğince yakın | — |
| Martin Fowler — [DDD Aggregate](https://martinfowler.com/bliki/DDD_Aggregate.html) | A | Aggregate tek birim olarak ele alınan nesne grubudur; dışarısı sadece root'a erişir; yükleme ve kaydetme bütün olarak yapılır | — |
| Chris Richardson — [Pattern: API Gateway](https://microservices.io/patterns/apigateway.html) | A | Gateway tek giriş noktasıdır, request'i route eder, kullanıcıyı authenticate edip bilgisini servislere taşıyabilir | Sayılan bedel: fazladan bir hareketli parça ve bir network hop |
| Robert C. Martin — *Clean Architecture* (kitap, 2017) | A | SOLID prensiplerinin kaynağı | Kitap; açılmadı |
| Eric Evans — *Domain-Driven Design* (kitap, 2003) | A | Entity, Aggregate, Repository kavramlarının kaynağı | Kitap; açılmadı |

## Infra — Terraform (Parça 1)

| Kaynak | Sv. | Bize ne söylüyor | Not |
|---|---|---|---|
| HashiCorp — [Associate 004 exam content](https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-review-004) | A | 8 objective ve alt maddeleri (1a–8d) | 1-infra.md'deki eşleme buradan |
| HashiCorp — [Certifications: Infrastructure Automation](https://developer.hashicorp.com/certifications/infrastructure-automation) | A | Sınav Terraform 1.12'yi test eder; çoktan seçmeli, bir saat | Ücret sayfada yazmıyor |
| Terraform — [Manage sensitive data](https://developer.hashicorp.com/terraform/language/manage-sensitive-data) | A | Local state düz metindir; `sensitive` sadece çıktıyı gizler, değer state'e yine yazılır. Ephemeral değerler state'e yazılmaz | — |
| Terraform — [Custom conditions](https://developer.hashicorp.com/terraform/language/validate) | A | Variable validation plan'dan önce çalışır ve işlemi durdurur; `check` block sadece uyarır | — |
| Terraform — [Style guide](https://developer.hashicorp.com/terraform/language/style) | A | Dosya adları ve içerikleri (`terraform.tf`, `providers.tf`, `main.tf`, `variables.tf`, `outputs.tf`); `.gitignore` içeriği; lock dosyası commit edilir; kaynak isimlendirme kuralları | — |
| Terraform — [Version constraints](https://developer.hashicorp.com/terraform/language/expressions/version-constraints) | A | `~>` sadece en sağdaki sürüm bileşeninin artmasına izin verir; root module'de provider için `~>` önerilir | — |
| Terraform — [Standard module structure](https://developer.hashicorp.com/terraform/language/modules/develop/structure) | A | `main.tf`, `variables.tf`, `outputs.tf`, README; iç module'ler `modules/` altında; her variable ve output'a açıklama | — |
| Terraform — [Refactoring](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring) | A | `moved` block state'teki adresi değiştirir; yoksa Terraform kaynağı silip yeniden yaratır | — |
| Terraform — [Import](https://developer.hashicorp.com/terraform/language/import) | A | `import` block var olan kaynağı Terraform yönetimine alır | — |
| Terraform — [Dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock) | A | `.terraform.lock.hcl` `init` ile oluşur, sadece provider sürümlerini tutar, version control'e girer | — |
| Terraform — [module block](https://developer.hashicorp.com/terraform/language/block/module) | A | `version` sadece registry module'lerinde desteklenir; local path `./` ile başlar | — |
| HCP Terraform — [Workspace settings](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings) | A | Local execution mode: komutlar kendi makinende çalışır, state workspace'te durur | — |
| [kreuzwerker/terraform-provider-docker](https://github.com/kreuzwerker/terraform-provider-docker) — `docs/` klasörü | A | `docker_network`, `docker_volume`, `docker_image`, `docker_container` argümanları | Provider'ın kendi dokümanı; HashiCorp ürünü değil, community provider |
| Docker Official Image — [postgres](https://github.com/docker-library/docs/blob/master/postgres/README.md) | A | `POSTGRES_PASSWORD` zorunlu; init script'leri sadece boş data klasöründe çalışır; 18+ sürümde volume yolu `/var/lib/postgresql` | — |
| PostgreSQL — [pg_isready](https://www.postgresql.org/docs/current/app-pg-isready.html) | A | Server bağlantı kabul ediyorsa exit code 0 | — |
| [hashicorp/random — random_password](https://github.com/hashicorp/terraform-provider-random/blob/main/docs/resources/password.md) | A | Rastgele şifre üretir, çıktıda gizler; değer state'e yazılır | İsteğe bağlı ek |

## Server — Node.js / TypeScript (Parça 2)

| Kaynak | Sv. | Bize ne söylüyor | Not |
|---|---|---|---|
| Node.js — [Modules: TypeScript](https://nodejs.org/api/typescript.html) | A | Type stripping "Stable". Type check yapmaz, `tsconfig.json` okumaz. `enum` ve parameter property ek flag ister, decorator desteklenmez. Import'ta uzantı ve `import type` zorunlu. TypeScript 5.8+ önerilir | — |
| Node.js — [Test runner](https://nodejs.org/api/test.html) | A | `node:test` v20'den beri stable; `node --test` ile çalışır, `.ts` test dosyalarını da bulur | — |
| Node.js — [Releases](https://nodejs.org/en/about/previous-releases) | A | v24 LTS, v26 Current (2026-10-08 itibarıyla) | Zamanla değişir |
| Express — [Migrating to Express 5](https://expressjs.com/en/guide/migrating-5.html) | A | Node.js 18+ ister; reddedilen promise otomatik olarak error handler'a gider | — |
| node-postgres — [Queries](https://node-postgres.com/features/queries) | A | Parametreli sorgu (`$1`, `$2`); string birleştirme SQL injection'a yol açar | — |
| TypeScript Handbook — [Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html) | A | `private` sadece type checking sırasında geçerli; `#alan` runtime'da da gizli | — |
| [goldbergyoni/nodebestpractices](https://github.com/goldbergyoni/nodebestpractices) | C | 1.2: web katmanı nesnelerini (`req`, `res`) domain'e sokma | Önerdiği yapı 3-tier'dır, onion değil; yön kuralını Palermo'dan alıyoruz |

## Policy — OPA (Parça 3)

| Kaynak | Sv. | Bize ne söylüyor | Not |
|---|---|---|---|
| OPA — [Integrating OPA](https://www.openpolicyagent.org/docs/integration) | A | Değerlendirme yolları: REST API, Go SDK, WebAssembly. En yaygını REST API | — |
| OPA — [HTTP API Authorization](https://www.openpolicyagent.org/docs/http-api-authorization) | A | Servis her HTTP request için OPA'ya sorar; input: kullanıcı, path, method | — |
| OPA — [Policy testing](https://www.openpolicyagent.org/docs/policy-testing) | A | `test_` ön eki, `opa test`, `-v`, `--coverage`, `with input as` ile mock; FAIL ve ERROR farkı | — |
| OPA — [REST API](https://www.openpolicyagent.org/docs/rest-api) | A | `POST /v1/data/{path}` ve `input`; undefined kararda HTTP 200, `result` alanı yok | — |
| OPA — [Upgrading to v1.0](https://www.openpolicyagent.org/docs/v0-upgrade) | A | `if` ve `contains` zorunlu; server varsayılan olarak `localhost`'a bağlanır | — |
| OPA — [Docker deploy](https://openpolicyagent.org/docs/deploy/docker) | A | Image `openpolicyagent/opa`; container'da `--addr=0.0.0.0:8181`; production için sabit sürüm tag'i | — |
| OPA — [OPA-Envoy plugin](https://www.openpolicyagent.org/docs/envoy) | A | Gateway'in her request için OPA'ya sorduğu external authorization pattern'i | Envoy kullanmıyoruz; aynı pattern'i kendi gateway'imizde uyguluyoruz |
| OWASP — [API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) | A | API1: kullanıcıdan gelen ID ile veri okuyan her fonksiyonda object-level kontrol gerekir. API5: function-level authorization | İki ayrı kararın (`route_allowed`, `allowed`) dayanağı |

## Gateway — Go (Parça 4)

| Kaynak | Sv. | Bize ne söylüyor | Not |
|---|---|---|---|
| Go — [Organizing a Go module](https://go.dev/doc/modules/layout) | A | Server projesinde logic `internal/` altında, komutlar `cmd/` altında | — |
| Go — [Routing Enhancements for Go 1.22](https://go.dev/blog/routing-enhancements) | A | `ServeMux` pattern'inde method ve `{wildcard}`; değer `PathValue` ile okunur | — |
| Go — [net/http/httputil](https://pkg.go.dev/net/http/httputil) | A | `ReverseProxy.Rewrite`; `Director` deprecated; `X-Forwarded-*` header'ları `Rewrite`'tan önce silinir | — |
| Go — [net/http `Server`](https://github.com/golang/go/blob/master/src/net/http/server.go) | A | Timeout alanlarında sıfır "timeout yok" demektir; `Shutdown` açık bağlantıları kesmeden kapatır | Doküman sayfası yerine kaynak koddaki doc comment'ler okundu |
| [golang-jwt/jwt v5](https://pkg.go.dev/github.com/golang-jwt/jwt/v5) | A | `Parse` + `Keyfunc`; `WithValidMethods`, `WithIssuer`, `WithAudience`, `WithExpirationRequired` | Kütüphanenin kendi dokümanı |
| IETF — [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725) | A | §3.1 algoritma doğrulaması, §3.8 issuer, §3.9 audience | — |
| MDN — [401 Unauthorized](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401), [409 Conflict](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409) | B | 401: geçerli kimlik bilgisi yok. 403: kimlik geçerli, izin yok. 409: kaynağın mevcut durumuyla çelişki | Asıl kaynak RFC 9110; sayfa çok uzun olduğu için ilgili bölümler doğrudan okunamadı, MDN üzerinden doğrulandı |

## Sektör kanıtı

| Kaynak | Sv. | Ne gösteriyor | Not |
|---|---|---|---|
| [Trendyol/micro-trendyol](https://github.com/Trendyol/micro-trendyol) | B | Hexagonal Architecture + DDD + CQRS + SAGA ile tasarlanmış örnek | Kasım 2022'de arşivlendi |
| [Trendyol GitHub](https://github.com/Trendyol) | B | Go ile yazılmış Kafka ve CDC araçları, test framework'ü | — |
| [Getir — Senior Backend Engineer](https://career.io/job/senior-backend-engineer-go-ankara-getir-cf67c021fb5254f307a359d68f0e5ba3) | B | Go ve Node.js (NestJS) aynı ilanda; SOLID açıkça yazıyor | Arama sonucundan okundu; ilan zamanla kapanabilir |

## Bilinen boşluklar

- RFC 9110 doğrudan okunamadı (yukarıda).
- Docker provider'ın bind mount ve macOS socket davranışı doğrulanmadı; bu yüzden md'lerde yer almıyor.
- İş ilanları stack'i gösterir, mimariyi göstermez. Mimari iddialar için sadece birincil kaynaklar sayılır.
