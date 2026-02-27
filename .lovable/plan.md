

# Trading Platformu - Guncellenmiş Plan

## Genel Bakis

Ekran goruntulerine dayali, koyu ve beyaz mod destekli, gercek al/sat islemli bir trading platformu olusturulacak.

## Tema ve Renk Sistemi

### Koyu Mod (Varsayilan)
- Arka plan: Koyu lacivert/siyah tonlari (#0a0e27, #111827)
- Kartlar: Yarim saydam koyu yuzeyler
- Vurgu renkleri:
  - Yesil: Alis/yukselis islemleri icin
  - Kirmizi: Satis/dusus islemleri icin
  - Mavi: Butonlar ve vurgu alanlari
  - Turuncu/Sari: Uyari ve bildirimler
- Metin: Beyaz ve gri tonlari

### Beyaz Mod
- Arka plan: Beyaz/acik gri
- Kartlar: Beyaz, hafif golge
- Ayni vurgu renkleri (yesil, kirmizi, mavi) korunacak
- Metin: Koyu gri/siyah tonlari

### Mod Gecisi
- Header'da bir Switch/Toggle butonu ile koyu/beyaz mod arasinda gecis
- next-themes kutuphanesi kullanilacak (zaten yuklu)
- Kullanicinin tercihi localStorage'da saklanacak

## Sayfa Yapisi

### 1. Giris ve Kayit Sayfalari
- Sol tarafta animasyonlu kazanc tablosu ve grafik
- Sag tarafta form alani
- Email/telefon + sifre ile giris
- Kayit formu: Ad Soyad, Email, Telefon, Sifre, Kullanici Tipi, Referans Kodu

### 2. Ana Dashboard
- Ust bar: Bakiye, Kredi, Acik K&Z, Varlik, Serbest Teminat bilgileri
- Hizli islem kartlari: Para Yatir, Para Cek, Kimlik Dogrulama
- Hesap Ozeti bolumu

### 3. Trading (Piyasalar) Sayfasi
- Sol panel: Favori listesi, sembol arama, kategori filtreleri (Emtia, Doviz, Endeks, BIST, Hisse, Kripto)
- Orta: Mum grafik (mock data ile baslangic)
- Sag panel: Alis/Satis fiyatlari, lot miktari, Market/Limit emirler, Zarar Durdur/Kar Al, SAT/AL butonlari

### 4. Kisisel Bilgilerim Sayfasi
- Profil bilgileri duzenleme
- Sifre degistirme
- Banka hesaplari yonetimi

### 5. Kimlik Dogrulama Sayfasi
- 3 adimli surec: On Yuz, Arka Yuz, Tamamlandi
- Belge yukleme arayuzu

### 6. Para Yatirma/Cekme Sayfasi
- Odeme yontemi secimi
- Son talepler listesi

### 7. Admin Paneli
- Kullanici yonetimi (detaylar sonra eklenecek)

## Teknik Detaylar

### Dosya Yapisi
- `src/pages/`: Login, Register, Dashboard, Trading, Profile, Verification, Deposit, Admin
- `src/components/layout/`: Sidebar, Header, ThemeToggle
- `src/components/trading/`: CandlestickChart, OrderPanel, SymbolList
- `src/components/dashboard/`: BalanceCards, QuickActions, AccountSummary
- `src/contexts/`: AuthContext, ThemeContext
- `src/types/`: User, Trade, Order, Symbol tipleri
- `src/data/`: Mock veriler (semboller, fiyatlar, islem gecmisi)

### Tema Uygulamasi
- CSS degiskenleri ile tum renkler tanimlanacak (index.css)
- `next-themes` ThemeProvider ile sarilacak
- Header'da Switch komponenti ile tema degisimi
- Koyu mod varsayilan olarak ayarlanacak

### Routing
- `/login` - Giris sayfasi
- `/register` - Kayit sayfasi
- `/dashboard` - Ana panel
- `/trading` - Piyasalar/Trading sayfasi
- `/profile` - Kisisel bilgiler
- `/verification` - Kimlik dogrulama
- `/deposit` - Para yatirma
- `/admin` - Admin paneli (korunmus rota)

### Veri Katmani
- Baslangicta mock data ile tum UI olusturulacak
- Supabase entegrasyonu sonraki asamada eklenecek
- Gercek borsa API ve odeme entegrasyonu en son asamada

