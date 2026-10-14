# DECISIONS.md — Karar Kaydı

> v1.0 · 2026-10-08 · Onaylandı
>
> Tüm kararlar 2026-10-08'de onaylandı. D-08 – D-13 Claude'un önerisiydi; diğerleri Bengü'nün kararı.
>
> Kaynaklar: [REFERENCES.md](./REFERENCES.md) · Ortak sözleşme: [TICKET.md](./TICKET.md)

## Amaç

Trendyol, Getir gibi firmalardaki backend ve infra prensiplerini local'de, küçültülmüş halde elle kurmak.
Hedef bir uygulama çıkarmak değil; yazılım tasarımı ve mimari becerisini geliştirmek.
Sertifika çalışmasının yanında, parça parça ilerler.

## Dört kural

1. **Küçük kalır.** Her parça tek bir şeyi öğretir ve tek başına biter. Bilinen her araç eklenmez.
2. **Vibe coding yok, öğretici ilerleme.** Kodu Bengü elle yazar; satır satır anlatılamayan kod repoya girmez. Claude her dosyayı "hangi karara ya da kaynağa uyduğu için var" açıklamasıyla birlikte verir. Destek parça ilerledikçe azalır: tam örnek → iskelet → sadece görev ve review.
3. **Kanıtlanmış kaynak.** Bir karar ancak birincil kaynağa (pattern'in sahibi ya da aracın resmi dokümanı) dayanıyorsa alınır. Doğrulanamayan bilgi md'ye yazılmaz.
4. **Aynı anda tek parça açık.** "Bitti" ölçütü geçmeden sıradakine başlanmaz.

## Kararlar

| ID | Karar | Durum |
|---|---|---|
| D-01 | Sistem dört küçük parçadan oluşur: `infra/`, `server/`, `policy/`, `gateway/` | Kabul |
| D-02 | Dört parçanın içinden geçen örnek domain: **ticket** | Kabul |
| D-03 | Server'ın temeli OOP + SOLID + onion architecture | Kabul |
| D-04 | Server Node.js ile yazılır | Kabul |
| D-05 | Gateway Go ile, hazır ürün kullanılmadan elle yazılır | Kabul |
| D-06 | Security'nin temeli OPA; dış request'ler gateway'den geçer | Kabul |
| D-07 | Infra Terraform ile kurulur; Docker local'de kullanılır | Kabul |
| D-08 | Server'da TypeScript (strict), Express 5; NestJS yok, dependency injection elle | Kabul |
| D-09 | Durum kuralları server'da, yetki kuralları OPA'da durur; aynı kural iki yere yazılmaz | Kabul |
| D-10 | OPA ayrı container'dır, REST API ile sorulur; default deny | Kabul |
| D-11 | Token RS256 ile imzalanır; gateway sadece public key tutar | Kabul |
| D-12 | Database PostgreSQL, tek tablo | Kabul |
| D-13 | Client yok; server `.http` dosyası ya da `curl` ile denenir | Kabul |
| D-14 | Sıra: `infra/` → `server/` → `policy/` → `gateway/` → bağlama. `infra/` hemen başlar | Kabul |

### Gerekçeler

**D-08 — TypeScript, Express, elle DI.** Onion'ın kalbi interface'tir; düz JavaScript'te interface yok. Express zaten bilinen framework, dikkat mimaride kalır ve sadece en dış halkada durur. NestJS dependency injection'ı decorator ve container arkasına saklar; burada amaç mekanizmayı görmek: bağımlılık constructor'dan verilir, hepsi tek bir composition root'ta bağlanır.
*Bedel:* NestJS sektörde yaygın (Getir ilanında var), bu projede öğrenilmez.
*Kaynak:* Palermo; Seemann.

**D-09 — İki tür kural, iki ayrı yer.**

| Tür | Soru | Yer |
|---|---|---|
| Durum kuralı | Bu ticket şu an bu işleme uygun mu? | `server/` domain katmanı |
| Yetki kuralı | Bu kişi bunu yapabilir mi? | `policy/` (OPA) |

Önceki konuşmada "kendi ticket'ını onaylayamazsın" kuralının hem class'ta hem OPA'da yazılabileceğini söylemiştim. Düzeltiyorum: bu bir yetki kuralı, sadece OPA'da durur. Aynı kuralı iki yere yazmak iki ayrı doğru kaynağı yaratır.

**D-10 — OPA ayrı container.** Go gateway de Node.js server da aynı yolu kullanır; "karar veren" ile "uygulayan" ayrımı gözle görülür.
*Kaynak:* OPA Integrating OPA (REST API en yaygın yol).

**D-11 — RS256.** Token'ı imzalayan private key gateway'de bulunmaz; gateway ele geçirilse bile token üretilemez. Gerçek sistemlerdeki identity provider ayrımının en küçük hali. Test token'ını küçük bir script imzalar.
*Kaynak:* RFC 8725 §3.1 (kabul edilen algoritma açıkça belirtilir).

**D-14 — Sıra.** Terraform Associate konuları tamamlandı (2026-10-08); `infra/` beklemeden kurulur ve sınav pratiğiyle paralel gider. Sıra bağımlılıktan gelir: server database'e, gateway ise server ve policy'ye ihtiyaç duyar.

## Yol haritası

| # | Parça | Tek öğrenme hedefi | Ayrıntı |
|---|---|---|---|
| 1 | `infra/` | Terraform: provider, variable, state, module | [parts/1-infra.md](./parts/1-infra.md) |
| 2 | `server/` | Onion ve dependency inversion | [parts/2-server.md](./parts/2-server.md) |
| 3 | `policy/` | Kararı koddan ayırmak | [parts/3-policy.md](./parts/3-policy.md) |
| 4 | `gateway/` | Reverse proxy ve middleware zinciri | [parts/4-gateway.md](./parts/4-gateway.md) |
| 5 | Bağlama | Parçaları tek `terraform apply` ile ayağa kaldırmak | 1-infra.md, "İkinci tur" |

## Bilinen bedeller

| Tercih | Gerçek dünyadan farkı |
|---|---|
| Gateway'i elle yazmak | Firmalar hazır ürün kullanır. Buradaki amaç reverse proxy ve middleware'in içini görmek |
| Container'ları Terraform ile yönetmek | Production'da uygulama container'ı böyle yönetilmez. Buradaki amaç Terraform'u gerçek kaynak üzerinde çalışmak |
| Kayıt sahipliği kontrolünün 5. adıma kalması | O adıma kadar sistem OWASP API1 açığına karşı korumasızdı; bilerek ertelendi. 2026-10-14'te kapandı: server her işlemden önce `allowed` kararını soruyor |
| Migration'ları server'ın açılışta uygulaması | Birden fazla kopya aynı anda açılırsa yarışabilir; production'da lock ya da ayrı bir deploy adımı kullanılır |

## Bilerek dışarıda

Kafka / RabbitMQ · Redis · Kubernetes · service mesh · ArgoCD · Vault · Keycloak · NestJS · frontend.
Hiçbiri "kötü" olduğu için değil; bu dört parçanın öğrettiği şeye bir şey eklemedikleri için yok.

## Proje sonunda tartışılacak

Gateway planlanırken (2026-10-12) kapsam dışı bırakıldı; Bengü'nün isteğiyle proje sonunda ek geliştirme fikri olarak ele alınacak.

| Konu | Neden şimdi değil |
|---|---|
| Rate limiting | Ölçülecek bir ihtiyaç yok; tek başına bir ek bölüm olabilir |
| TLS termination | Sertifika yönetimi ayrı bir konu |
| Load balancing (birden fazla gateway ya da server kopyası) | Tek kopya ile çalışıyoruz; gateway state tutmayacak şekilde yazılıyor |
| Response caching | Ticket verisi değişken; ne zaman cache'lenebileceği ayrı bir tasarım sorusu |
| OPA kararlarını cache'lemek | Policy değişince eski kararın yaşaması riski |
| Metrics (Prometheus) | Ayrı bir altyapı ister; şimdilik structured log yeterli |
