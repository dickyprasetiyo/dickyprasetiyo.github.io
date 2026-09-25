# Stock Portfolio Tracker

Portfolio tracker berbasis web untuk memantau portofolio saham Anda.

## Fitur

- **Dashboard** - Pantau IHSG, harga saham, grafik real-time
- **Portfolio Manager** - Kelola saham yang Anda miliki
- **Trading Journal** - Catat setiap keputusan trading
- **Advanced Charts** - Grafik candlestick menggunakan TradingView Lightweight Charts
- **Google Sheets Integration** - Sinkronisasi data ke cloud
- **Export/Import CSV** - Backup dan restore data

## Teknologi

- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5 untuk UI
- TradingView Lightweight Charts untuk grafik
- Yahoo Finance API untuk data saham
- Google Sheets + Apps Script untuk cloud storage
- LocalStorage untuk penyimpanan lokal

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/dickyprasetiyo/dickyprasetiyo.github.io.git
cd dickyprasetiyo.github.io
```

### 2. Setup Google Sheets (Optional)

1. Buat Google Sheet baru dengan tab "Portfolio" dan "Journal"
2. Buka Extensions > Apps Script
3. Copy script dari file `google-sheets-apps-script.js`
4. Deploy sebagai Web App (Anyone access)
5. Masukkan Web App URL di Settings tab

### 3. Deploy

```bash
git add .
git commit -m "Update: Stock Portfolio Tracker"
git push origin master
```

## Struktur File

```
/
├── index.html           # Halaman utama
├── assets/
│   ├── css/
│   │   └── style.css    # Custom styles
│   ├── js/
│   │   └── stock-tracker.js  # Main application
│   └── img/
│       └── favicon.png  # Favicon
└── README.md
```

## Cara Penggunaan

### Dashboard
- Lihat harga IHSG dan saham lainnya
- Cari saham dengan kode (contoh: BBCA)
- Lihat grafik IHSG dengan rentang waktu berbeda

### Portfolio
- Tambah saham yang Anda miliki
- Input: kode saham, jumlah lot, harga beli, tanggal beli, catatan
- Lihat ringkasan: total investasi, current value, profit/loss
- Lihat grafik per saham

### Journal
- Catat setiap trade (buy/sell/hold)
- Input: saham, tipe, jumlah, harga, catatan, review
- Evaluasi trading Anda

### Settings
- Konfigurasi Google Sheets integration
- Export/Import data
- Test koneksi

## Lisensi

© 2026 Dicky Prasetiyo. Free to use.

## Disclaimer

Aplikasi ini untuk tujuan edukasi dan pantauan. Bukan saran investasi. 
Data dari Yahoo Finance tidak menjamin akurasi real-time. Investasi saham memiliki risiko.
