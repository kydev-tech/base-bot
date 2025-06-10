# WhatsApp Bot Simple

Bot WhatsApp sederhana menggunakan Baileys dan MongoDB dengan struktur yang mudah dipahami.

## 📁 Struktur File

```
whatsapp-bot/
├── package.json          # Dependencies
├── config.js            # Konfigurasi bot
├── database.js          # Database MongoDB
├── utils.js             # Utility functions
├── handler.js          # Message handler
├── case.js             # Semua command/case
├── func-case.js        # Semua function command/case
├── index.js            # File utama
└── README.md           # Dokumentasi
```

## 🚀 Instalasi

1. **Clone atau download project ini**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup MongoDB**
   - Install MongoDB di komputer Anda
   - Atau gunakan MongoDB Atlas (cloud)
   - Update URL di `config.js`

4. **Edit konfigurasi di `config.js`**
   ```javascript
   ownerNumber: '628123456789', // Ganti dengan nomor owner
   botName: 'Nama Bot Anda',
   prefix: '!',
   ```

5. **Jalankan bot**
   ```bash
   npm start
   # atau untuk development
   npm run dev
   ```

6. **Scan QR Code atau gunakan pairing code**

## 📱 Command List

### Menu Umum
- `!menu` - Tampilkan menu
- `!daftar` - Daftar ke bot
- `!profile` - Lihat profile

### Menu Owner
- `!setlevel <nomor> <level>` - Set level user (guest/reseller/owner)
- `!addsaldo <nomor> <jumlah>` - Tambah saldo user

## 🎖️ Level User

1. **Guest** - User biasa
2. **Reseller** - User reseller
3. **Owner** - Akses penuh ke semua fitur

## 💾 Database Schema

### User Collection
```javascript
{
  jid: String,           // WhatsApp ID
  name: String,          // Nama user
  level: String,         // guest/reseller/owner
  saldo: Number,         // Saldo user
  isRegistered: Boolean, // Status registrasi
  registeredAt: Date,    // Tanggal daftar
  lastSeen: Date        // Terakhir online
}
```

### Group Collection
```javascript
{
  jid: String,      // Group ID
  name: String,     // Nama group
  welcome: Boolean, // Welcome message
  antilink: Boolean // Anti link
}
```

## 🔧 Tambah Command Baru

Edit file `case.js` dan tambahkan:

```javascript
case 'namacommand':
    await namaCommandCase(sock, msg);
    break;
```

Kemudian buat function baru:

```javascript
const namaCommandCase = async (sock, msg) => {
    try {
        // Logic command di sini
        await sock.sendMessage(msg.from, { text: 'Pesan balasan' });
    } catch (error) {
        console.log('Error:', error.message);
    }
};
```

## 📝 Notes

- Bot akan otomatis reconnect jika terputus
- Database terhubung otomatis saat start
- Owner otomatis terdeteksi saat daftar
- Semua error akan ter-handle dengan baik

## 🆘 Troubleshooting

1. **Bot tidak connect**
   - Pastikan internet stabil
   - Hapus folder session dan scan ulang

2. **Database error**
   - Pastikan MongoDB berjalan
   - Cek connection string di config

3. **Command tidak jalan**
   - Cek prefix di config
   - Pastikan sudah daftar dengan `!daftar`

## 📞 Support

Jika ada pertanyaan atau masalah, silakan contact developer.
Evandra 085646700334

## 📄 License

MIT License
