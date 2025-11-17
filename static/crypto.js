(function(window) {
  'use strict';

  const crypto = {};

  const IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
  const FP = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25];

  function modPow(base, exp, mod) {
    
    let b = BigInt(base);
    let e = BigInt(exp);
    let m = BigInt(mod);
    
    let result = BigInt(1);
    b = b % m;
    while (e > BigInt(0)) {
      if (e % BigInt(2) === BigInt(1)) {
        result = (result * b) % m;
      }
      e = e / BigInt(2);
      b = (b * b) % m;
    }
    return Number(result);
  }
  crypto.modPow = modPow;

  function gcd(a, b) {
    a = BigInt(a);
    b = BigInt(b);
    while (b !== BigInt(0)) {
      [a, b] = [b, a % b];
    }
    return Number(a);
  }

  function extended_gcd(a, b) {
    a = BigInt(a);
    b = BigInt(b);
    if (a === BigInt(0)) {
      return [Number(b), 0, 1];
    }
    const [gcd_val, x1, y1] = extended_gcd(Number(b % a), Number(a));
    const x = y1 - Math.floor(Number(b) / Number(a)) * x1;
    const y = x1;
    return [gcd_val, x, y];
  }

  function mod_inverse(e, phi) {
    const [gcd_val, x] = extended_gcd(e % phi, phi);
    if (gcd_val !== 1) {
      throw new Error("Modular inverse does not exist");
    }
    let result = (x % phi + phi) % phi;

    while (result < 0) result += phi;
    return Math.floor(result);
  }

  function _randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function _getRandBits(bits) {
    const min = Math.pow(2, bits - 1);
    const max = Math.pow(2, bits) - 1;
    return _randRange(min, max);
  }

  function is_prime(n, k = 5) {
    if (n < 2) return false;
    if (n === 2 || n === 3) return true;
    if (n % 2 === 0) return false;

    let r = 0;
    let d = n - 1;
    while (d % 2 === 0) {
      r += 1;
      d = Math.floor(d / 2);
    }

    for (let i = 0; i < k; i++) {
      const a = _randRange(2, n - 2);
      let x = modPow(a, d, n);

      if (x === 1 || x === n - 1) continue;

      let in_loop = false;
      for (let j = 0; j < r - 1; j++) {
        x = modPow(x, 2, n);
        if (x === n - 1) {
          in_loop = true;
          break;
        }
      }
      if (!in_loop) return false;
    }
    return true;
  }

  function generate_prime(bits) {
    while (true) {
      let p = _getRandBits(bits);
      p |= (1 << (bits - 1)) | 1;

      if (is_prime(p)) {
        return p;
      }
    }
  }

  crypto.generateRSAKeyPair = function(bits = 16) {
    console.warn(`Generating ${bits}-bit RSA key. This is NOT secure.`);
    let p = generate_prime(bits);
    let q = generate_prime(bits);

    while (p === q) {
      q = generate_prime(bits);
    }

    const n = p * q;
    const phi = (p - 1) * (q - 1);

    let e = 65537;
    if (e >= phi || gcd(e, phi) !== 1) {
      e = _randRange(2, phi - 1);
      while (gcd(e, phi) !== 1) {
        e = _randRange(2, phi - 1);
      }
    }

    const d = mod_inverse(e, phi);

    return {
      publicKey: [e, n],
      privateKey: [d, n]
    };
  }

  crypto.encryptRSA = function(plaintextString, publicKey) {
    const [e, n] = publicKey;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(plaintextString);
    
    const ciphertext = [];
    for (let byte of bytes) {
      const encryptedByte = modPow(byte, e, n);
      ciphertext.push(encryptedByte);
    }
    return ciphertext;
  }

  crypto.decryptRSA = function(ciphertext, privateKey) {
    const [d, n] = privateKey;
    const plaintext = [];
    for (let encryptedByte of ciphertext) {
      const decryptedByte = modPow(encryptedByte, d, n);
      plaintext.push(decryptedByte);
    }
    return crypto.bytesToString(plaintext);
  }
  
  function textToBits(text) {
    return text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');
  }

  function bitsToText(bits) {
    let text = '';
    for (let i = 0; i < bits.length; i += 8) {
      text += String.fromCharCode(parseInt(bits.substr(i, 8), 2));
    }
    return text;
  }

  function xor(a, b) {
    const minLen = Math.min(a.length, b.length);
    let result = '';
    for (let i = 0; i < minLen; i++) {
      result += a[i] === b[i] ? '0' : '1';
    }
    return result;
  }

  function padText(text) {
    while (text.length % 8 !== 0) {
      text += ' ';
    }
    return text;
  }

  function simpleRoundFunc(block, keyBits) {
    return xor(block, keyBits.substr(0, block.length)); 
  }

  function desEncryptBlock(blockBits, keyBits) {

    let permuted = '';
    for (let i of IP) {
      permuted += blockBits[i - 1] || '0';
    }
    let left = permuted.substr(0, 32);
    let right = permuted.substr(32);

    for (let i = 0; i < 16; i++) {
      const roundKey = keyBits.repeat(Math.ceil(32 / keyBits.length)).substr(0, 32);
      let newRight = xor(left, simpleRoundFunc(right, roundKey));
      left = right;
      right = newRight;
    }
    
    let preOutput = right + left;
    let output = '';
    for (let i of FP) {
      output += preOutput[i - 1] || '0';
    }
    return output;
  }

  function desDecryptBlock(blockBits, keyBits) {
    
    let permuted = '';
    for (let i of IP) {
      permuted += blockBits[i - 1] || '0';
    }
    let left = permuted.substr(0, 32);
    let right = permuted.substr(32);

    for (let i = 0; i < 16; i++) {
      const roundKey = keyBits.repeat(Math.ceil(32 / keyBits.length)).substr(0, 32);
      let newRight = xor(left, simpleRoundFunc(right, roundKey));
      left = right;
      right = newRight;
    }

    let preOutput = right + left;
    let output = '';
    for (let i of FP) {
      output += preOutput[i - 1] || '0';
    }
    return output;
  }

  crypto.encryptDES = function(plaintext, key) {
    plaintext = padText(plaintext);
    key = padText(key).substr(0, 8);
    const keyBits = textToBits(key);
    let ciphertext = '';
    for (let i = 0; i < plaintext.length; i += 8) {
      const block = plaintext.substr(i, 8);
      const blockBits = textToBits(block);
      const encBits = desEncryptBlock(blockBits, keyBits);
      ciphertext += bitsToText(encBits);
    }
    return ciphertext;
  }

  crypto.decryptDES = function(ciphertext, key) {
    key = padText(key).substr(0, 8);
    const keyBits = textToBits(key);
    let plaintext = '';
    for (let i = 0; i < ciphertext.length; i += 8) {
      const block = ciphertext.substr(i, 8);
      const blockBits = textToBits(block);
      const decBits = desDecryptBlock(blockBits, keyBits);
      plaintext += bitsToText(decBits);
    }
    return plaintext.trim();
  }

  crypto.stringToKey = function(keyStr) {
    const parts = keyStr.split(',');
    return [parseInt(parts[0]), parseInt(parts[1])];
  }

  crypto.keyToString = function(key) {
    return `${key[0]},${key[1]}`;
  }

  crypto.bytesToString = function(bytes) {
    return new TextDecoder().decode(Uint8Array.from(bytes));
  }
  
  crypto.generateRandomKey = function(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Debug / Test functions (Delete later maybe??)
  crypto._textToBits = textToBits;
  crypto._bitsToText = bitsToText;
  crypto._xor = xor;
  crypto._padText = padText;
  crypto._desEncryptBlock = desEncryptBlock;
  crypto._desDecryptBlock = desDecryptBlock;

  window.appCrypto = crypto;

})(window);