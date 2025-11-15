import random
import math

def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def mod_inverse(e, phi):
    def extended_gcd(a, b):
        if a == 0:
            return b, 0, 1
        gcd_val, x1, y1 = extended_gcd(b % a, a)
        x = y1 - (b // a) * x1
        y = x1
        return gcd_val, x, y
    
    _, x, _ = extended_gcd(e % phi, phi)
    return (x % phi + phi) % phi

def is_prime(n, k=5):
    
    if n < 2:
        return False
    if n == 2 or n == 3:
        return True
    if n % 2 == 0:
        return False
    
    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1
        d //= 2
    
    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)
        
        if x == 1 or x == n - 1:
            continue
        
        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False
    
    return True

def generate_prime(bits=16):
    
    while True:
        p = random.getrandbits(bits)
        p |= (1 << bits - 1) | 1 
        
        if is_prime(p):
            return p

def generate_keypair(bits=16):

    p = generate_prime(bits)
    q = generate_prime(bits)
    
    while p == q:
        q = generate_prime(bits)
    
    n = p * q
    phi = (p - 1) * (q - 1)
    
    e = 65537
    if e >= phi or gcd(e, phi) != 1:
        e = random.randrange(2, phi)
        while gcd(e, phi) != 1:
            e = random.randrange(2, phi)
    
    d = mod_inverse(e, phi)
    
    return ((e, n), (d, n))

def encrypt_rsa(plaintext, public_key):

    e, n = public_key
    
    if isinstance(plaintext, str):
        plaintext = plaintext.encode('utf-8')

    ciphertext = []
    for byte in plaintext:
        encrypted_byte = pow(byte, e, n)
        ciphertext.append(encrypted_byte)
    
    return ciphertext

def decrypt_rsa(ciphertext, private_key):

    d, n = private_key
    
    plaintext_bytes = []
    for encrypted_byte in ciphertext:
        decrypted_byte = pow(encrypted_byte, d, n)
        plaintext_bytes.append(decrypted_byte)
    
    return bytes(plaintext_bytes).decode('utf-8')

def key_to_string(key):
    return f"{key[0]},{key[1]}"

def string_to_key(key_str):
    parts = key_str.split(',')
    return (int(parts[0]), int(parts[1]))