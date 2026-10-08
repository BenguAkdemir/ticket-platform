# Parça 1 — `infra/` (Terraform)

> v1.0 · 2026-10-08 · Onaylandı

**Tek öğrenme hedefi:** Terraform'un çekirdeği: provider, resource, variable, output, state, module.

**Firmadaki karşılığı:** Altyapı elle değil kodla kurulur ve aynı kod her çalıştırıldığında aynı sonucu verir.

**Bitti ölçütü:** `terraform apply` ile network ve PostgreSQL kalkıyor, `terraform destroy` ile hiçbir şey kalmadan gidiyor, ve PostgreSQL bir module'ün içinde.

## Araçlar

| Araç | Not |
|---|---|
| Terraform | 1.12 veya üstü. Associate sınavının test ettiği sürüm 1.12 |
| Provider | `kreuzwerker/docker`, sürüm sabitlenir (provider dokümanındaki örnek 4.6.0 gösteriyor) |
| Image | `postgres:18` |

## Adımlar

Her adımın yanında, pratik ettiği sınav objective'i var.

| # | Adım | Objective |
|---|---|---|
| 1 | `terraform` block ve `required_providers` ile provider'ı sabitle; `init` çalıştır, oluşan `.terraform.lock.hcl` dosyasını incele | 2a, 2b, 3b |
| 2 | Bir `docker_network`, bir `docker_volume`, bir `docker_image` ve bir `docker_container` yaz. Kaynakları birbirine attribute referansıyla bağla | 4a, 4b, 4f |
| 3 | `fmt`, `validate`, `plan`, `apply`, `destroy` döngüsünü çalıştır; her `plan` çıktısını `apply`'dan önce oku | 3a, 3c–3g |
| 4 | Database adı, kullanıcı ve şifreyi variable yap. Şifreye `sensitive`, port'a `validation` ekle. Bağlantı bilgisini output olarak ver | 4c, 4g, 4h |
| 5 | `terraform.tfstate` dosyasını aç ve şifreyi ara | 2d, 6a, 4h |
| 6 | Container'a healthcheck ekle (`pg_isready`), `wait = true` yap | — (sınavda yok; 2. parça için gerekli) |
| 7 | PostgreSQL kaynaklarını `modules/postgres` altına taşı; `moved` block ile kaynakların silinip yeniden yaratılmasını önle | 5a, 5b, 5c |
| 8 | `terraform state list` ve `state show` ile state'i gez. Container'ı elle sil, `plan` ile drift'i gör | 6d, 7b |
| 9 | Elle bir container yarat, `import` block ile Terraform'a al | 7a |

## Düşünme soruları

Cevabı yazmadan önce kendin dene; takıldığında sor.

- Adım 2'de `depends_on` yazmadan Terraform doğru sırayı nasıl buluyor?
- Adım 5'te `sensitive = true` olan şifreyi state'te buldun. O zaman `sensitive` tam olarak neyi koruyor?
- Adım 7'de bir module, kendisini çağıran root module'ün variable'ını neden doğrudan göremiyor?

## Bilinen tuzaklar

| Tuzak | Açıklama | Kaynak |
|---|---|---|
| PostgreSQL 18 volume yolu | 18 ve üstünde volume `/var/lib/postgresql` yoluna bağlanır. 17 ve altında `/var/lib/postgresql/data` idi; eski yazıların çoğu bunu gösterir | PostgreSQL image dokümanı |
| `POSTGRES_PASSWORD` | Image'ın zorunlu tek environment variable'ı | PostgreSQL image dokümanı |
| Init script'leri | `/docker-entrypoint-initdb.d` altındaki script'ler sadece data klasörü boşken çalışır. Volume doluysa değişikliğin etkisi olmaz | PostgreSQL image dokümanı |
| `wait = true` | Healthcheck tanımlı değilse provider hata verir | Provider `docker_container` dokümanı |
| Port tüm arayüzlere açılır | `ports` içindeki `ip` varsayılanı `0.0.0.0`. Sadece kendi makinen için `127.0.0.1` yaz | Provider `docker_container` dokümanı |
| State düz metindir | Local state şifreyi düz metin saklar; `sensitive` sadece CLI çıktısını gizler. State dosyası git'e girmez | Terraform, Manage sensitive data |
| Module'e taşıma | `moved` block olmadan Terraform adres değişikliğini "eskiyi sil, yenisini yarat" diye okur | Terraform, Refactoring |
| Lock dosyası | `.terraform.lock.hcl` git'e girer; sadece provider sürümlerini tutar | Terraform, Dependency lock file |
| Local module'de `version` | `version` argümanı sadece registry module'lerinde çalışır | Terraform, module block |

## Bu parçanın çalıştırmadığı objective'ler

Dürüst liste; bunlar kurs ve dokümanla çalışılır.

| Objective | Neden burada yok |
|---|---|
| 1a–1c (IaC kavramları, multi-cloud) | Kavramsal |
| 2c (birden fazla provider) | İsteğe bağlı ek ile gelir, aşağıda |
| 4d, 4e (complex type, expression, function) | İkinci turda gelir |
| 5d (module sürümleri) | Local module'de sürüm yok |
| 6b, 6c (state locking, remote backend) | Local backend kullanıyoruz |
| 7c (verbose logging) | Tek komutluk bir deneme; adım olarak yazılmadı |
| 8a–8d (HCP Terraform) | İsteğe bağlı ek ile kısmen, aşağıda |

## İsteğe bağlı ekler

| Ek | Ne kazandırır |
|---|---|
| `hashicorp/random` provider'ından `random_password` | İkinci provider (2c). Değer yine state'e yazılır; doküman state'e yazmamak için ephemeral halini önerir |
| HCP Terraform, **local** execution mode | State HCP'de durur, komutlar kendi makinende çalışır (8a ve 8c'ye kısmen dokunur). Remote execution'da komutlar HCP'nin makinelerinde çalışır; onlar senin Docker'ına erişemeyeceği için bu projede kullanılamaz (çıkarım) |

## İkinci tur: bağlama (yol haritasında 5. adım)

Parça 2, 3 ve 4 bittikten sonra buraya dönülür.

| # | Adım |
|---|---|
| 1 | `server/` ve `gateway/` için birer Dockerfile; `docker_image` içindeki `build` block ile Terraform'dan build et |
| 2 | OPA, server ve gateway container'larını ekle. Benzer container'ları `for_each` ile tek tanımdan üret (4d, 4e) |
| 3 | Host'a sadece gateway'in portunu aç. PostgreSQL, OPA ve server host'tan erişilemez olsun |
| 4 | Server, kayıt sahipliği için OPA'ya `allowed` kararını sorsun (TICKET.md, P3–P5) |

**Bitti ölçütü:** Boş bir makinede `terraform apply` sonrası TICKET.md'deki bütün akış gateway üzerinden çalışıyor; server'a host'tan doğrudan istek atılamıyor.

## Kaynaklar

REFERENCES.md, "Infra" bölümü.
