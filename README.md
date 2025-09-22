# WhatsApp Bot Simple

Bot WhatsApp sederhana yang dibangun menggunakan Baileys dengan sistem pairing code dan tampilan yang modern.

## Features

- 🔄 Auto-reconnect saat koneksi terputus
- 📱 Pairing code (tanpa QR scan)
- 🎨 Tampilan console yang modern dengan chalk
- 📂 Sistem plugin modular
- 🔍 Command suggestion dengan fuzzy matching
- 📊 Message logging dengan informasi detail
- ⚡ Auto-reload plugin saat ada perubahan
- 🛡️ Error handling yang robust

## Requirements

- Node.js v20.0.0 atau lebih tinggi
- NPM atau Yarn

## Installation

1. Clone repository ini:
```bash
git clone https://github.com/Evandra19/whatsapp-bot-simple.git
cd whatsapp-bot-simple
```

2. Install dependencies:
```bash
npm install
```

3. Setup konfigurasi:
   - Edit `settings.js` untuk mengatur nomor owner dan prefix
   - Buat file `.env` jika diperlukan

4. Jalankan bot:
```bash
npm start
```

## Configuration

Edit file `settings.js`:

```javascript
global.ownerNumber = ["6285714608649","6285775269316"]; // Nomor owner
global.prefix = "."; // Prefix command
global.pairing = true; // true untuk pairing code
```

## First Run

1. Jalankan bot dengan `npm start`
2. Masukkan nomor WhatsApp Anda (dengan kode negara)
3. Masukkan kode pairing yang ditampilkan ke WhatsApp Anda
4. Bot akan terhubung dan siap digunakan

## File Structure

```
├── lang.js              # File utama bot
├── langs.js             # Handler pesan dan command
├── settings.js          # Konfigurasi bot
├── lib/
│   └── parser.js        # Message parser
├── plugins/             # Folder untuk plugin command
├── database/
│   └── menu.json        # Database menu dan command
└── temp/                # Folder temporary untuk file
```

## Adding Commands

1. Buat file baru di folder `plugins/`
2. Tambahkan command info di `database/menu.json`
3. Command akan auto-reload saat file berubah

Contoh plugin sederhana:
```javascript
module.exports = async (lang, m, isRegistered, text, isOwner, command, prefix) => {
    if (command === 'ping') {
        m.reply('Pong! Bot sedang online')
    }
}
```

## Environment Variables

Buat file `.env` untuk konfigurasi tambahan:
```env
CORRECT_COMMAND=true  # Enable command suggestion
```

## Scripts

- `npm start` - Menjalankan bot
- `npm test` - Menjalankan unit test

## Features Detail

### Auto-Reconnect
Bot akan otomatis mencoba reconnect jika koneksi terputus dengan berbagai strategi reconnect.

### Command Suggestion  
Jika command salah ketik, bot akan menyarankan command yang mirip menggunakan algoritma Levenshtein distance.

### Plugin System
Sistem plugin yang fleksibel dengan auto-reload saat development.

### Modern Console
Tampilan console yang informatif dengan warna-warna yang menarik menggunakan chalk.

## Troubleshooting

### Bot tidak bisa connect
- Pastikan nomor WhatsApp valid
- Cek koneksi internet
- Hapus folder `sessionlang` dan coba lagi

### Command tidak berfungsi
- Cek apakah file plugin ada di folder `plugins/`
- Pastikan command terdaftar di `database/menu.json`
- Lihat console untuk error message

### Error saat install
- Pastikan Node.js versi 20+ sudah terinstall
- Coba `npm cache clean --force`
- Hapus `node_modules` dan `package-lock.json`, lalu `npm install` lagi

## Contributing

1. Fork repository ini
2. Buat branch feature baru (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## Support

Jika menemukan bug atau memiliki pertanyaan:
- Buat issue di GitHub repository
- Join grup WhatsApp support (jika ada)

## Disclaimer

Bot ini dibuat untuk tujuan edukasi dan personal use. Gunakan dengan bijak dan ikuti terms of service WhatsApp.

## License

MIT License - lihat file [LICENSE](LICENSE) untuk detail lengkap.

## Credits

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- Dan semua contributor yang telah membantu

---

**Made with ❤️ by [Evandra19](https://github.com/Evandra19)**