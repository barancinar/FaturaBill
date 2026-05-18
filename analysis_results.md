# Expo Router Route Overlap (Çakışma) Analizi

## 🚨 Hata Nerede ve Neden Oluyor?

Expo Router, dosya tabanlı bir yönlendirme (file-based routing) sistemi kullanır. Projenizdeki şu anki dosya yapısına baktığımızda şöyle bir durum var:

1. `app/(tabs)/subscriptions.tsx` -> Bu dosya **`/subscriptions`** rotasını oluşturur ve Tab Bar'da (alt menüde) yer alır.
2. `app/subscriptions/[id].tsx` -> Bu dosya ise **`/subscriptions/[id]`** rotasını oluşturur.

**Sorunun Kaynağı (Hata Yaptığınız Yer):**
Expo Router'da bir layout grubu (örneğin `(tabs)`) içinde yer alan bir dosya ismiyle (`subscriptions.tsx`), dışarıda yer alan bir klasör ismi (`subscriptions`) **aynı olduğunda**, Expo Router bu rotaları otomatik olarak birleştirir (merge). 

Bu birleşme sonucunda Expo Router, `[id].tsx` sayfasını `(tabs)` layout'unun bir parçası zannederek onu Tab Bar'a eklemeye çalışır. `constants/data.ts` içinde tanımlı olmasa bile, Expo Router `(tabs)` alanıyla eşleştiğini düşündüğü her rota için otomatik olarak bir sekme (tab) butonu üretir. İşte alt menüde (tabs kısmında) `id` veya boş bir sekmenin görünmesinin sebebi budur.

---

## 🛠️ Çözüm Yolları

Bu sorunu çözmek için uygulamanızın nasıl davranmasını istediğinize bağlı olarak 2 farklı yol izleyebilirsiniz:

### Çözüm 1: Detay Sayfasında Alt Menü (Tab Bar) GÖRÜNMESİN İstiyorsanız (Önerilen)
Eğer kullanıcı bir aboneliğin detayına (`[id].tsx`) girdiğinde alt menünün kaybolmasını, sayfanın tam ekran açılmasını istiyorsanız, yapmanız gereken tek şey isim çakışmasını engellemektir.

* **Nasıl Yapılır?**
  1. `app/subscriptions` klasörünün adını değiştirerek tekil hale getirin: `app/subscription` (sonundaki 's' harfini silin).
  2. Sayfa rotası artık `app/subscription/[id].tsx` olacaktır.
  3. `app/(tabs)/index.tsx` içerisindeki linkleri güncelleyin: `href="/subscription/[id]"`
  *Sonuç:* Rotalar farklılaştığı için Expo Router bunları birleştirmez ve `[id]` sayfası Tab Bar'da görünmez.

### Çözüm 2: Detay Sayfasında Alt Menü (Tab Bar) GÖRÜNSÜN İstiyorsanız
Eğer kullanıcı detay sayfasına girdiğinde alt menü (Tab Bar) hala aşağıda sabit kalsın istiyorsanız, bir "Nested Stack" (Tab içinde Stack) mimarisi kurmalısınız.

* **Nasıl Yapılır?**
  1. `app/(tabs)/subscriptions.tsx` dosyasını SİLİN.
  2. Onun yerine `app/(tabs)/subscriptions` adında bir klasör oluşturun.
  3. Eski listeleme sayfanızı `app/(tabs)/subscriptions/index.tsx` olarak bu klasöre taşıyın.
  4. Detay sayfanızı da `app/(tabs)/subscriptions/[id].tsx` olarak bu klasöre taşıyın.
  5. Bu klasörün içine bir `_layout.tsx` açıp içine `<Stack>` ekleyin.
  *Sonuç:* Abonelikler sekmesi tek bir Tab olarak kalır, detay sayfasına geçişler bu sekmenin içinde (Tab Bar kaybolmadan) gerçekleşir ve fazladan bir sekme ikonu oluşmaz.

---
> [!NOTE]
> Projenizde hangi davranışı sergilemek istediğinize (Detayda Tab Bar kalsın mı, gitsin mi?) karar verirseniz, kodları sizin yerinize otomatik olarak düzenleyebilirim.
