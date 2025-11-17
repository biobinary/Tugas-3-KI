## Tugas 3 Keamanan Informasi C

| Nama                   | NRP        | Kelas                |
|------------------------|------------|----------------------|
| Muhammad Ammar Ghifari | 5025231109 | Keamanan Informasi C |
| Filbert Hainsly Martin | 5025231256 | Keamanan Informasi C |

---

## 📌 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Arsitektur & Komponen](#-arsitektur--komponen)
- [Prasyarat](#-prasyarat)
- [Instalasi](#-instalasi)
- [Penggunaan](#-penggunaan)
- [Struktur Proyek](#-struktur-proyek)
- [Dokumentasi Teknis](#-dokumentasi-teknis)
- [Cara Kerja Enkripsi](#-cara-kerja-enkripsi)
- [Catatan & Troubleshooting](#-catatan--troubleshooting)
- [Referensi](#-referensi)
- [Lisensi & Kontak](#-lisensi--kontak)

---

## ✨ Fitur Utama

### 🔐 Keamanan
- Generasi pasangan kunci RSA 16-bit via PyScript (`static/RSA.py`)
- Enkripsi payload menggunakan DES per pesan (`static/DES.py`)
- Skema hybrid: DES untuk konten, RSA untuk mendistribusikan kunci DES
- Public key pengguna dibroadcast agar peer dapat saling mengenkripsi

### 👥 Komunikasi Real-time
- Flask-SocketIO dengan Eventlet sebagai WebSocket server
- Manajemen daftar pengguna online secara otomatis
- Penyampaian pesan terenkripsi end-to-end (server tidak menyentuh plaintext)

### 🎨 Interface
- Antarmuka gelap modern berbasis Bootstrap 5 + Bootstrap Icons
- PyScript 2025.11.1 untuk menjalankan Python di browser
- Responsif untuk perangkat mobile dengan offcanvas sidebar

---

## 🧱 Arsitektur & Komponen

```
┌─────────┐      socket.io      ┌────────────┐
│ Browser │◄────────────────────►│ Flask App  │
│ (PyScript)   encrypted frame   │ (app.py)   │
└─────────┘                      └────────────┘
     │                               │
     │ RSA/DES crypto (client)       │
     └──────► Hanya relay ciphertext │
```

- **Frontend (client-side Python)**  
  Menggunakan PyScript untuk menjalankan `static/RSA.py`, `static/DES.py`, dan `static/main.py`. Semua kunci privat tetap di browser.
- **Backend (server-side Python)**  
  `app.py` menangani registrasi user, penyiaran daftar user, dan relay pesan antar room Socket.IO.

---

## 📦 Prasyarat

- Python 3.11 (atau 3.10+)  
- Pip terbaru (disarankan)
- Koneksi internet untuk CDN (Bootstrap, Socket.IO, PyScript)
- Browser modern (Chrome/Edge/Firefox) dengan dukungan WebAssembly

### Dependencies Python (dari `requirements.txt`)
- Flask 3.1.2
- Flask-SocketIO 5.5.1
- Flask-CORS 6.0.1
- Eventlet 0.40.3
- python-engineio 4.12.3
- simple-websocket 1.1.0
- Wsproto / bidict / dnspython / greenlet / blinker, dst (lihat file requirements)

Tidak ada pycryptodome/rsa library eksternal karena RSA & DES diimplementasikan manual di folder `static/`.

---

## 🚀 Instalasi

```bash
# 1. Masuk ke folder proyek
cd "d:\Documents\Keamanan Informasi\Tugas-3-KI\Tugas-3-KI"

# 2. (Opsional) Buat virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows PowerShell

# 3. Install dependencies backend
pip install -r requirements.txt

# 4. Jalankan server Flask-SocketIO
python app.py
```

Secara bawaan aplikasi tersedia di `http://0.0.0.0:5000` (atau `http://localhost:5000` di mesin lokal).

---

## 📖 Penggunaan

1. **Buka UI** melalui browser ke `http://localhost:5000`.  
2. **Input username** kemudian klik `Register & Generate Keys`. PyScript otomatis membangkitkan pasangan kunci RSA 16-bit.  
3. **Bagikan public key**: server akan menyiarkan username + public key Anda ke semua klien.  
4. **Pilih penerima** pada dropdown `Send To`. Public key penerima terlihat pada panel info.  
5. **Ketik pesan** lalu klik `Send` (atau `Ctrl+Enter`).  
6. **Penerima** mendekripsi kunci DES dengan private key mereka dan pesan tampil sebagai plaintext di sisi klien.  

> **Catatan:** Jika semua pengguna logout, dropdown tujuan akan menampilkan `No users online`.

---

## 📂 Struktur Proyek

```
Tugas-3-KI/
├── app.py                 # Backend Flask + Flask-SocketIO
├── requirements.txt       # Dependensi Python backend
├── README.md
│
├── static/
│   ├── DES.py             # Implementasi DES (client-side, PyScript)
│   ├── RSA.py             # Implementasi RSA (client-side, PyScript)
│   ├── main.py            # Orkestrasi PyScript + DOM + Socket.IO
│   └── style.css          # Styling tambahan
│
└── templates/
    └── index.html         # Satu-satunya halaman web (memuat PyScript)
```

Tidak ada file `app.js` atau `crypto.js`. Seluruh logika frontend sekarang berada di `static/main.py`.

---

## 🔧 Dokumentasi Teknis

### `app.py` – Backend Flask
- Endpoint utama `GET /` merender `templates/index.html`.
- Socket.IO events:
  - `register`: menyimpan `username`, `sid`, dan `public_key` ke dictionary `users`.
  - `users`: broadcast daftar user aktif (username + public key string).
  - `send_message`: relay payload terenkripsi ke room milik penerima.
  - `receive_message`: event yang diterima klien sebagai hasil relay.
  - `send_ack`: umpan balik ke pengirim.
  - `disconnect`: hapus user yang putus koneksi.
- Keamanan server: tidak pernah menyimpan private key; hanya key publik + SID.

### `static/main.py` – Frontend Controller
- Dimuat lewat `<py-script src="/static/main.py">`.
- Memuat modul `RSA.py` & `DES.py` secara dinamis menggunakan `fetch()` kemudian `exec()`.
- Menangani:
  - Registrasi user & penyimpanan key pair
  - Dropdown penerima, penyalinan key, avatar user
  - Enkripsi & dekripsi pesan, logging, error handling UI
  - Interaksi DOM & event listener (register, logout, send, ctrl+enter)

### `static/RSA.py`
- Implementasi RSA sederhana (Miller–Rabin, Extended Euclid, dsb).
- `generate_keypair(bits=16)` menghasilkan `(public_key, private_key)` tuple.
- `encrypt_rsa` & `decrypt_rsa` bekerja pada byte tiap karakter.
- Fungsi utilitas `key_to_string` dan `string_to_key` memudahkan transport via Socket.IO.

### `static/DES.py`
- Implementasi DES penuh di Python (64-bit block, 16 round).
- Fungsi utama: `encrypt_buffer`, `decrypt_buffer`, `pad_text`, `text_to_bits`, dsb.
- Dipanggil langsung oleh `static/main.py` untuk enkripsi/dekripsi pesan teks.

### `templates/index.html`
- Menggabungkan Bootstrap 5, Bootstrap Icons, dan PyScript CDN.
- Memuat sidebar login, kartu tampilan public/private key, area pesan, serta PyScript runtime.

---

## 🔐 Cara Kerja Enkripsi

1. **Client A** membuat kunci DES acak 8 karakter (`generate_random_key`) saat hendak mengirim pesan.
2. Pesan plaintext dienkripsi dengan `encrypt_buffer` (DES) → menghasilkan ciphertext berbentuk string.
3. Kunci DES dienkripsi dengan `encrypt_rsa` memakai public key milik penerima (didapat dari broadcast server).
4. Client A mengirim payload via Socket.IO:
   ```python
   {
       'from': username,
       'to': recipient,
       'encrypted_key': encrypted_des_key,  # list angka RSA
       'ciphertext': ciphertext_bytes       # list kode ASCII
   }
   ```
5. **Server** hanya meneruskan payload ke room penerima tanpa proses kriptografi apa pun.
6. **Client B**:
   - Mendekripsi kunci DES memakai private key RSA (`decrypt_rsa`).
   - Mendekripsi ciphertext memakai `decrypt_buffer`.
   - Menampilkan plaintext pada riwayat pesan.

Keuntungan pendekatan ini:
- Kunci privat tidak pernah meninggalkan browser pengguna.
- Server tidak mengetahui isi pesan.
- DES dipakai karena implementasi sederhana untuk tugas; bukan rekomendasi produksi.

---

## ⚠️ Catatan & Troubleshooting

### Catatan Keamanan
- Implementasi untuk **tujuan akademis**; jangan gunakan di produksi.
- RSA 16-bit mudah dipecahkan. Gunakan minimal 2048-bit dan AES-256 untuk aplikasi nyata.
- Belum ada otentikasi atau manajemen sesi; siapa pun bisa mendaftar dengan nama bebas.
- Pastikan koneksi HTTPS bila di-deploy agar metadata Socket.IO terlindungi.

### Masalah Umum

| Gejala | Solusi |
|--------|--------|
| Port 5000 sudah dipakai | Jalankan `Get-NetTCPConnection -LocalPort 5000` lalu ubah port di `socketio.run(..., port=5001)` |
| Module import error | Pastikan venv aktif dan jalankan `pip install -r requirements.txt` |
| PyScript gagal load RSA/DES | Pastikan file tersedia di `/static/` dan server mengizinkan akses statis |
| WebSocket blocked | Cek firewall/antivirus; pastikan koneksi tidak lewat proxy yang memblokir WS |

---

## 📚 Referensi

- [RSA Cryptosystem](https://en.wikipedia.org/wiki/RSA_(cryptosystem))
- [Data Encryption Standard](https://en.wikipedia.org/wiki/Data_Encryption_Standard)
- [Hybrid Cryptosystem](https://en.wikipedia.org/wiki/Hybrid_cryptosystem)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Flask-SocketIO Docs](https://flask-socketio.readthedocs.io/)
- [PyScript Docs](https://docs.pyscript.net/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

## 📄 Lisensi & Kontak

Proyek disusun untuk kebutuhan akademis di lingkungan Universitas dan dapat digunakan kembali untuk pembelajaran.

**Author & Maintainer**
- Muhammad Ammar Ghifari (5025231109)
- Filbert Hainsly Martin (5025231256)

Hubungi tim melalui:
- 📧 Email: *[isi sesuai kebutuhan]*
- 🔗 GitHub: `biobinary/Tugas-3-KI`

---

**Last Updated**: November 2025  
**Version**: 1.1
