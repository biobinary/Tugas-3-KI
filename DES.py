# DES.py
# Implementasi sederhana DES (Data Encryption Standard)
# hanya untuk pembelajaran (tidak untuk keamanan nyata)

from itertools import cycle

# --- Permutasi & konstanta DES ---
IP = [58,50,42,34,26,18,10,2,
      60,52,44,36,28,20,12,4,
      62,54,46,38,30,22,14,6,
      64,56,48,40,32,24,16,8,
      57,49,41,33,25,17,9,1,
      59,51,43,35,27,19,11,3,
      61,53,45,37,29,21,13,5,
      63,55,47,39,31,23,15,7]

FP = [40,8,48,16,56,24,64,32,
      39,7,47,15,55,23,63,31,
      38,6,46,14,54,22,62,30,
      37,5,45,13,53,21,61,29,
      36,4,44,12,52,20,60,28,
      35,3,43,11,51,19,59,27,
      34,2,42,10,50,18,58,26,
      33,1,41,9,49,17,57,25]

# Fungsi bantu
def text_to_bits(text):
    return ''.join(format(ord(c), '08b') for c in text)

def bits_to_text(bits):
    return ''.join(chr(int(bits[i:i+8], 2)) for i in range(0, len(bits), 8))

def xor(a, b):
    return ''.join('0' if i == j else '1' for i, j in zip(a, b))

def pad_text(text):
    while len(text) % 8 != 0:
        text += ' '
    return text

def simple_round_func(block, key_bits):
    return xor(block, key_bits[:len(block)])

def des_encrypt_block(block_bits, key_bits):
    block_bits = ''.join(block_bits[i-1] for i in IP)
    left, right = block_bits[:32], block_bits[32:]
    for _ in range(16):
        new_right = xor(left, simple_round_func(right, key_bits))
        left, right = right, new_right
    pre_output = right + left
    return ''.join(pre_output[i-1] for i in FP)

def des_decrypt_block(block_bits, key_bits):
    block_bits = ''.join(block_bits[i-1] for i in IP)
    left, right = block_bits[:32], block_bits[32:]
    for _ in range(16):
        new_right = xor(left, simple_round_func(right, key_bits))
        left, right = right, new_right
    pre_output = right + left
    return ''.join(pre_output[i-1] for i in FP)

def encrypt_buffer(text, key):
    text = pad_text(text)
    key_bits = text_to_bits(pad_text(key)[:8])
    ciphertext = ""
    for i in range(0, len(text), 8):
        block_bits = text_to_bits(text[i:i+8])
        enc_bits = des_encrypt_block(block_bits, key_bits)
        ciphertext += bits_to_text(enc_bits)
    return ciphertext

def decrypt_buffer(ciphertext, key):
    key_bits = text_to_bits(pad_text(key)[:8])
    plaintext = ""
    for i in range(0, len(ciphertext), 8):
        block_bits = text_to_bits(ciphertext[i:i+8])
        dec_bits = des_decrypt_block(block_bits, key_bits)
        plaintext += bits_to_text(dec_bits)
    return plaintext.strip()
