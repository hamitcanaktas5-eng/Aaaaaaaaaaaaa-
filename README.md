# 📱 RoxyScore v0.4 — APK & Kurulum Kılavuzu

## 🔥 Firebase Kurulumu (Önce Bu)

Firebase Console'da şunları açman lazım:

1. **firebase.google.com** → Proje: `roxyscore`
2. **Authentication** → Sign-in method → **Email/Password** → Etkinleştir
3. **Firestore Database** → Oluştur (test modunda başla)
4. **Hosting** → Başlat

---

## 🌐 Yol 1: Firebase Hosting (PWA — En Hızlı)

```bash
# Telefonda Chrome ile aç → "Ana ekrana ekle"
# Tam ekran, uygulama gibi çalışır

npm install -g firebase-tools
firebase login
firebase init hosting   # public folder = "."
firebase deploy
```

Sonra telefonda: `https://roxyscore.web.app` → Chrome → ⋮ → **Ana ekrana ekle**

---

## 📦 Yol 2: WebIntoApp (APK — 5 dakika, kodsuz)

1. **webintoapp.com**'a git
2. URL: `https://roxyscore.web.app` gir
3. Uygulama adı: `RoxyScore`
4. İkon yükle (icon-512.png)
5. **Oluştur** → APK indir → Telefonuna yükle

> ⚠️ Push notification bu yöntemde çalışmaz. Ama temel özellikler sorunsuz çalışır.

---

## 🚀 Yol 3: Capacitor (Gerçek APK — Önerilen)

> **Gereksinimler:** Node.js, Android Studio (Windows/Mac/Linux)

```bash
# 1. Proje hazırlığı
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Capacitor başlat
npx cap init RoxyScore com.roxyscore.app --web-dir .

# 3. Android ekle
npx cap add android

# 4. Android Studio'da aç
npx cap sync
npx cap open android

# 5. Android Studio → Build → Generate Signed APK
# 6. APK'yı telefonuna at
```

**Sertifika (keystore) oluşturma:**
```bash
keytool -genkey -v -keystore roxyscore.keystore -alias roxyscore -keyalg RSA -keysize 2048 -validity 10000
```

---

## 🔔 Gerçek Push Bildirimleri (FCM)

Push bildirimleri için Firebase Cloud Functions gerekiyor:

1. Firebase Console → **Cloud Messaging** → Web Push Sertifikası oluştur
2. VAPID key'i kopyala
3. `home.js`'de şu satırı uncomment et:
   ```js
   // const messaging = firebase.messaging();
   // messaging.requestPermission();
   ```

> Şimdilik uygulama içi simüle bildirimler çalışıyor.
> Gerçek push için backend kurulumu gerektirir (Cloud Functions).

---

## 🔑 API Limitleri

- **API-Football Free Plan:** Günde 100 istek
- Bugünkü maçlar = 1 istek
- Canlı maçlar = 1 istek (60sn'de bir)
- Maç detayı = 3-4 istek (events + stats + lineup + h2h)

**Ücretli plana geçmeden önce Free plan yeterlidir.**

---

## 📁 Dosya Yapısı

```
roxyscore/
├── index.html          # Giriş/Kayıt (Firebase Auth)
├── home.html           # Ana sayfa (API-Football)
├── match.html          # Maç detayı
├── team.html           # Takım profili
├── favorites.html      # Favoriler
├── support.html        # Destek
├── table.html          # Puan tablosu (v0.2'de)
├── config.js           # Firebase + API yapılandırması
├── api.js              # API-Football servis katmanı
├── data.js             # Firebase Auth + localStorage
├── shared.js/css       # Paylaşılan yardımcılar
├── sw.js               # Service Worker (PWA + Push)
├── manifest.json       # PWA manifest
└── icon-*.png          # Uygulama ikonları
```

---

## 🗓️ Sonraki Adımlar (v0.2)

- [ ] Puan tabloları (API entegrasyonu hazır)
- [ ] Firestore ile kullanıcı favorileri (cihazlar arası senkron)
- [ ] Gerçek FCM push bildirimleri
- [ ] Play Store yayını
