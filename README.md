## Tugas 3 Keamanan Informasi C

| Nama                   | NRP        | Kelas                |
|------------------------|------------|----------------------|
| Muhammad Ammar Ghifari | 5025231109 | Keamanan Informasi C |
| Filbert Hainsly Martin | 5025231256 | Keamanan Informasi C |

---

## 📌 Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur Keamanan](#arsitektur-keamanan)
- [Prasyarat](#prasyarat)
- [Instalasi](#instalasi)
- [Penggunaan](#penggunaan)
- [Struktur Proyek](#struktur-proyek)
- [Dokumentasi Teknis](#dokumentasi-teknis)
- [Cara Kerja Enkripsi](#cara-kerja-enkripsi)

---

## ✨ Fitur Utama

### 🔐 Keamanan
- **RSA Encryption**: Generasi kunci publik-privat 16-bit untuk setiap pengguna
- **DES Encryption**: Enkripsi pesan dengan kunci simetris per-pesan
- **Hybrid Encryption**: Kombinasi RSA dan DES untuk performa optimal
- **End-to-End Encryption**: Hanya penerima yang dapat mendekripsi pesan

### 👥 Komunikasi Real-time
- **WebSocket Support**: Komunikasi instan menggunakan Socket.IO
- **Multi-user Chat**: Dukungan komunikasi antara multiple pengguna secara bersamaan
- **User List**: Daftar pengguna online dengan public key mereka
- **Connection Management**: Pengelolaan otomatis koneksi pengguna

### 🎨 Interface
- **Responsive Design**: Antarmuka yang responsif menggunakan Bootstrap 5
- **Dark Mode**: Tema gelap untuk pengalaman visual yang nyaman
- **Real-time Updates**: Pembaruan daftar pengguna secara real-time
- **Message History**: Riwayat pesan dalam sesi aktif

---

## 🏗️ Arsitektur Keamanan

### Alur Enkripsi Pesan

```
┌─────────────┐
│   Message   │
└──────┬──────┘
       │
       ├─ Generate Random DES Key
       │
       ├─ Encrypt Message with DES
       │  │
       │  └─> Ciphertext (Pesan Terenkripsi)
       │
       ├─ Encrypt DES Key with Recipient's RSA Public Key
       │  │
       │  └─> Encrypted Key
       │
       └─> Send: [Encrypted Key, Ciphertext]
                 (via Socket.IO)
```

### Alur Dekripsi Pesan

```
┌──────────────────────────────┐
│  Receive: [Encrypted Key,    │
│            Ciphertext]       │
└──────────┬───────────────────┘
           │
           ├─ Decrypt DES Key with Private Key (RSA)
           │  │
           │  └─> DES Key
           │
           ├─ Decrypt Ciphertext with DES Key
           │  │
           │  └─> Original Message
           │
           └─> Display Message
```

---

## 📦 Prasyarat

### Sistem Operasi
- Windows, macOS, atau Linux
- Python 3.8 atau lebih tinggi

### Dependencies
- Flask 3.1.2 - Web framework
- Flask-SocketIO 5.5.1 - Real-time WebSocket support
- pycryptodome 3.23.0 - Library kriptografi
- rsa 4.9.1 - Implementasi RSA
- python-socketio 5.14.2 - Client library Socket.IO
- eventlet 0.40.3 - Asynchronous I/O library

---

## 🚀 Instalasi

### 1. Clone Repository atau Extract Files

```bash
cd "d:\Documents\Keamanan Informasi\Tugas-3-KI\Tugas-3-KI"
```

### 2. Buat Virtual Environment (Opsional tapi Direkomendasikan)

```bash
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1

# atau menggunakan Command Prompt
python -m venv venv
venv\Scripts\activate.bat

# atau macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Jalankan Aplikasi

```bash
python app.py
```

Aplikasi akan berjalan di: **http://0.0.0.0:5000**

---

## 📖 Penggunaan

### Langkah-Langkah Penggunaan

1. **Buka aplikasi di browser**
   - Navigasi ke `http://0.0.0.0:5000`

2. **Register dengan username**
   - Masukkan username pilihan Anda
   - Klik tombol "Register & Generate Keys"
   - RSA key pair akan di-generate otomatis

3. **Lihat daftar pengguna online**
   - Daftar pengguna yang tersedia akan ditampilkan
   - Public key setiap pengguna juga ditampilkan

4. **Kirim pesan ke pengguna lain**
   - Pilih pengguna dari daftar
   - Ketik pesan di input box
   - Tekan Enter atau klik tombol Send

5. **Terima dan dekripsi pesan**
   - Pesan yang masuk akan otomatis didekripsi
   - Riwayat percakapan akan ditampilkan

### Screenshot Flow

```
1. Login/Register Screen
   ↓
2. View Online Users + Your RSA Keys
   ↓
3. Select User → Type Message → Send
   ↓
4. Message Encrypted + Sent
   ↓
5. Recipient Receives → Auto Decrypt → Display
```

---

## 📂 Struktur Proyek

```
Tugas-3-KI/
├── app.py                    # Flask application & WebSocket handlers
├── RSA.py                    # Implementasi algoritma RSA
├── DES.py                    # Implementasi algoritma DES
├── requirements.txt          # Python dependencies
├── README.md                 # Dokumentasi (file ini)
│
├── static/                   # Static files
│   ├── app.js               # Frontend JavaScript logic
│   ├── crypto.js            # Crypto operations di browser
│   └── style.css            # Custom CSS styling
│
└── templates/                # HTML templates
    └── index.html           # Main web interface
```

---

## 🔧 Dokumentasi Teknis

### RSA.py - Implementasi RSA

**Fungsi Utama:**

| Fungsi | Deskripsi |
|--------|-----------|
| `generate_prime(bits=16)` | Generate bilangan prima random dengan jumlah bit tertentu |
| `generate_keypair(bits=16)` | Generate pasangan kunci RSA (public, private) |
| `encrypt_rsa(plaintext, public_key)` | Enkripsi plaintext dengan public key RSA |
| `decrypt_rsa(ciphertext, private_key)` | Dekripsi ciphertext dengan private key RSA |
| `key_to_string(key)` | Konversi key tuple ke string format |
| `string_to_key(key_str)` | Konversi string ke key tuple |
| `is_prime(n, k=5)` | Miller-Rabin primality test |
| `mod_inverse(e, phi)` | Hitung modular inverse menggunakan Extended Euclidean Algorithm |

**Parameter RSA:**
- **Key Size**: 16-bit (untuk demo; dalam praktik gunakan 2048+ bit)
- **Public Exponent (e)**: 65537 (standard)
- **Private Exponent (d)**: Dihitung dengan Extended Euclidean Algorithm

### DES.py - Implementasi DES

**Fungsi Utama:**

| Fungsi | Deskripsi |
|--------|-----------|
| `encrypt_buffer(text, key)` | Enkripsi text dengan DES |
| `decrypt_buffer(ciphertext, key)` | Dekripsi ciphertext dengan DES |
| `des_encrypt_block(block_bits, key_bits)` | Enkripsi single 64-bit block |
| `des_decrypt_block(block_bits, key_bits)` | Dekripsi single 64-bit block |
| `text_to_bits(text)` | Konversi text ke binary string |
| `bits_to_text(bits)` | Konversi binary string ke text |
| `pad_text(text)` | Padding text ke multiple of 8 bytes |

**Parameter DES:**
- **Block Size**: 64 bits
- **Key Size**: 64 bits (8 bytes)
- **Number of Rounds**: 16
- **Permutation**: Initial & Final permutation tables

### app.py - Flask Backend

**Socket.IO Events:**

| Event | Arah | Fungsi |
|-------|------|--------|
| `register` | Client → Server | Register user dengan public key |
| `register_response` | Server → Client | Response status registrasi |
| `send_message` | Client → Server | Kirim encrypted message |
| `receive_message` | Server → Client | Terima encrypted message |
| `send_ack` | Server → Client | Acknowledge message delivery |
| `users` | Server → Client | Broadcast daftar pengguna online |
| `disconnect` | Client → Server | User disconnect |

**Data Structures:**

```python
users = {
    'username': {
        'sid': 'socket_id',           # Socket.IO session ID
        'public_key': (e, n)          # RSA public key tuple
    },
    ...
}
```

### crypto.js - Frontend Crypto

Implementasi RSA dan DES di sisi client untuk keamanan maksimal.

### app.js - Frontend Logic

Menangani:
- User registration dan key generation
- Socket.IO event handling
- Message encryption/decryption
- UI updates

---

## 🔐 Cara Kerja Enkripsi

### Skenario: User A mengirim pesan ke User B

#### Step 1: Generasi DES Key (Client A)
```python
# Random 8-byte key untuk DES
des_key = secrets.token_bytes(8)
```

#### Step 2: Enkripsi Pesan dengan DES (Client A)
```python
# Encrypt message dengan DES key
plaintext = "Hello, World!"
ciphertext = encrypt_buffer(plaintext, des_key)
```

#### Step 3: Enkripsi DES Key dengan RSA Public Key User B (Client A)
```python
# Ambil public key User B dari server
public_key_B = users['B']['public_key']  # (e, n)

# Encrypt DES key dengan RSA
encrypted_key = encrypt_rsa(des_key, public_key_B)
```

#### Step 4: Kirim ke Server
```javascript
// Send via Socket.IO
socket.emit('send_message', {
    from: 'User_A',
    to: 'User_B',
    encrypted_key: encrypted_key,    // RSA encrypted DES key
    ciphertext: ciphertext           // DES encrypted message
});
```

#### Step 5: Server Relay ke User B
```python
# Server menerima dan forward ke recipient
socketio.emit('receive_message', {
    from: frm,
    encrypted_key: encrypted_key,
    ciphertext: ciphertext,
}, room=to)  # Kirim ke User B
```

#### Step 6: Dekripsi di Client B
```python
# User B terima message
# Step 1: Decrypt DES key dengan private key RSA
des_key = decrypt_rsa(encrypted_key, private_key_B)

# Step 2: Decrypt message dengan DES key
plaintext = decrypt_buffer(ciphertext, des_key)
# plaintext = "Hello, World!"
```

### Keuntungan Hybrid Encryption

| Aspek | RSA Only | DES Only | Hybrid (RSA + DES) |
|-------|----------|----------|-------------------|
| Keamanan | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Kecepatan | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Distribusi Key | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Overhead | Tinggi | Rendah | Sedang |

**Keuntungan:**
- RSA: Aman untuk key exchange tanpa pre-shared secret
- DES: Cepat untuk enkripsi data dalam jumlah besar
- Kombinasi: Optimal untuk speed & security

---

## ⚠️ Catatan Penting

### Keamanan

- **Implementasi Edukasi**: Kode ini untuk **pembelajaran saja**, bukan untuk production
- **Key Size Kecil**: Menggunakan 16-bit RSA untuk demo (gunakan 2048+ untuk production)
- **DES Deprecated**: DES sudah deprecated; gunakan AES untuk production
- **No Authentication**: Tidak ada user authentication; siapa saja bisa register dengan username apa pun

### Rekomendasi Production

```python
# Gunakan library yang sudah battle-tested
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

# RSA key size minimal
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,  # Minimal untuk production
)

# Gunakan AES bukan DES
cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
```

---

## 🐛 Troubleshooting

### Port sudah digunakan
```bash
# Windows PowerShell - Lihat port apa yang digunakan
Get-NetTCPConnection -LocalPort 5000

# Ubah port di app.py
socketio.run(app, host='0.0.0.0', port=5001)  # Ubah ke port lain
```

### Import Error
```bash
# Pastikan virtual environment aktif dan dependencies terinstall
pip install -r requirements.txt

# Atau install secara manual
pip install flask flask-socketio python-socketio pycryptodome
```

### WebSocket Connection Error
- Pastikan firewall tidak memblokir port 5000
- Cek browser console untuk error messages
- Pastikan Socket.IO client dan server versi compatible

---

## 📚 Referensi & Resources

### Algoritma Kriptografi
- [RSA Cryptosystem - Wikipedia](https://en.wikipedia.org/wiki/RSA_(cryptosystem))
- [Data Encryption Standard - Wikipedia](https://en.wikipedia.org/wiki/Data_Encryption_Standard)
- [Hybrid Encryption - Wikipedia](https://en.wikipedia.org/wiki/Hybrid_cryptosystem)

### Libraries & Framework
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [PyCryptodome Documentation](https://pycryptodome.readthedocs.io/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)

### Best Practices
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST Guidelines for Cryptography](https://www.nist.gov/cryptography)

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan akademis di Universitas dan tersedia untuk keperluan pembelajaran.

---

## 👨‍💻 Author & Maintainer

**Tugas-3-KI** - Keamanan Informasi C
- Muhammad Ammar Ghifari (5025231109)
- Filbert Hainsly Martin (5025231256)

Untuk pertanyaan atau feedback, silakan hubungi tim melalui:
- 📧 Email: [contact details]
- 🔗 GitHub: biobinary/Tugas-3-KI

---

**Last Updated**: November 2025  
**Version**: 1.0
