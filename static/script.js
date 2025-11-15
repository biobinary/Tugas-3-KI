const socket = io();
let username = null;
let publicKey = null;
let privateKey = null;
let userPublicKeys = {};

const elements = {
  loginSection: null,
  keysSection: null,
  chatSection: null,
  emptyState: null,
  username: null,
  users: null,
  message: null,
  inbox: null,
  me: null,
  userAvatar: null,
  publicKeyDisplay: null,
  privateKeyDisplay: null,
  recipientKeyDisplay: null,
  sidebar: null
};

document.addEventListener('DOMContentLoaded', () => {
  elements.loginSection = document.getElementById('login-section');
  elements.keysSection = document.getElementById('keys-section');
  elements.chatSection = document.getElementById('chat-section');
  elements.emptyState = document.getElementById('empty-state');
  elements.username = document.getElementById('username');
  elements.users = document.getElementById('users');
  elements.message = document.getElementById('message');
  elements.inbox = document.getElementById('inbox');
  elements.me = document.getElementById('me');
  elements.userAvatar = document.getElementById('userAvatar');
  elements.publicKeyDisplay = document.getElementById('publicKeyDisplay');
  elements.privateKeyDisplay = document.getElementById('privateKeyDisplay');
  elements.recipientKeyDisplay = document.getElementById('recipientKeyDisplay');
  elements.sidebar = new bootstrap.Offcanvas(document.getElementById('sidebarOffcanvas'));
});

function stringToKey(keyStr) {
  const parts = keyStr.split(',');
  return [parseInt(parts[0]), parseInt(parts[1])];
}

function modPow(base, exp, mod) {
  let result = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) {
      result = (result * base) % mod;
    }
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return result;
}

function bytesToString(bytes) {
  return bytes.map(b => String.fromCharCode(b)).join('');
}

function decryptRSA(ciphertext, privateKey) {
  const [d, n] = privateKey;
  const plaintext = [];
  for (let encryptedByte of ciphertext) {
    const decryptedByte = modPow(encryptedByte, d, n);
    plaintext.push(decryptedByte);
  }
  return bytesToString(plaintext);
}

const IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
const FP = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25];

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
  let result = '';
  for (let i = 0; i < a.length; i++) {
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

function desDecryptBlock(blockBits, keyBits) {
  let permuted = '';
  for (let i of IP) {
    permuted += blockBits[i - 1];
  }
  let left = permuted.substr(0, 32);
  let right = permuted.substr(32);
  for (let i = 0; i < 16; i++) {
    let newRight = xor(left, simpleRoundFunc(right, keyBits));
    left = right;
    right = newRight;
  }
  let preOutput = right + left;
  let output = '';
  for (let i of FP) {
    output += preOutput[i - 1];
  }
  return output;
}

function decryptDES(ciphertext, key) {
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

document.getElementById('btnRegister').addEventListener('click', () => {
  const u = elements.username.value.trim();
  if (!u) {
    alert('Username required');
    return;
  }
  username = u;
  socket.emit('register', { username });
});

document.getElementById('btnLogout').addEventListener('click', () => {
  socket.disconnect();
  location.reload();
});

document.getElementById('btnSend').addEventListener('click', () => {
  sendMessage();
});

document.getElementById('message').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    sendMessage();
  }
});

elements.users?.addEventListener('change', () => {
  const selectedUser = elements.users.value;
  if (selectedUser && userPublicKeys[selectedUser]) {
    elements.recipientKeyDisplay.innerHTML = 
      `<strong>Recipient's Public Key:</strong> <code class="bg-success-subtle p-1 rounded small">${userPublicKeys[selectedUser]}</code>`;
  } else {
    elements.recipientKeyDisplay.innerHTML = '';
  }
});

function sendMessage() {
  const to = elements.users.value;
  const msg = elements.message.value.trim();
  if (!to) {
    alert('Please select a recipient');
    return;
  }
  if (!msg) {
    alert('Please type a message');
    return;
  }
  socket.emit('send_message', { from: username, to, message: msg });
  elements.message.value = '';
}

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('register_response', (data) => {
  
  if (data.ok) {

    publicKey = stringToKey(data.public_key);
    privateKey = stringToKey(data.private_key);
    
    elements.loginSection.classList.add('d-none');
    elements.keysSection.classList.remove('d-none');
    
    elements.chatSection.classList.remove('d-none');
    elements.emptyState.classList.add('d-none');
    
    elements.me.textContent = username;
    elements.userAvatar.textContent = username.charAt(0).toUpperCase();
    
    const pubKeyText = document.createTextNode(data.public_key);
    const privKeyText = document.createTextNode(data.private_key);
    
    elements.publicKeyDisplay.insertBefore(pubKeyText, elements.publicKeyDisplay.firstChild);
    elements.privateKeyDisplay.insertBefore(privKeyText, elements.privateKeyDisplay.firstChild);
    
    console.log('✅ Registered successfully');
    console.log('Public Key:', publicKey);
    console.log('Private Key:', privateKey);
    
    if (window.innerWidth < 768) {
      elements.sidebar.hide();
    }
  
  } else {
    alert('Registration failed: ' + (data.error || 'unknown error'));
  
  }

});

socket.on('users', (list) => {
  const sel = elements.users;
  const prevValue = sel.value;
  sel.innerHTML = '';
  userPublicKeys = {};
  const availableUsers = list.filter(u => u.username !== username);
  
  if (availableUsers.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No users online';
    opt.disabled = true;
    sel.appendChild(opt);
  } else {
    availableUsers.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.username;
      opt.textContent = u.username;
      sel.appendChild(opt);
      userPublicKeys[u.username] = u.public_key;
    });
    
    if (prevValue && availableUsers.some(u => u.username === prevValue)) {
      sel.value = prevValue;
      elements.users.dispatchEvent(new Event('change'));
    } else if (availableUsers.length > 0) {
      sel.value = availableUsers[0].username;
      elements.users.dispatchEvent(new Event('change'));
    }
  }
});

socket.on('send_ack', (data) => {
  if (!data.ok) {
    alert('Failed to send message: ' + (data.error || 'unknown error'));
  } else {
    console.log('✅ Message sent successfully');
  }
});

socket.on('receive_message', (data) => {
  const { from, encrypted_key, ciphertext } = data;
  console.log('📨 Received message from:', from);
  
  try {
    const desKey = decryptRSA(encrypted_key, privateKey);
    console.log('🔓 Decrypted DES key:', desKey);
    const plaintext = decryptDES(ciphertext, desKey);
    console.log('📝 Decrypted message:', plaintext);
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message received card bg-light border-start border-success border-3 p-3';
    
    msgDiv.innerHTML = `
      <div class="badge bg-success mb-2"><i class="bi bi-check-lg"></i> ✅ Decrypted</div>
      <div class="fw-bold text-success fs-6 mb-1">${from}</div>
      <div class="message-content mb-2">${escapeHtml(plaintext)}</div>
      <div class="small text-muted">
        <div>DES Key (encrypted): ${JSON.stringify(encrypted_key.slice(0, 3))}...</div>
        <div>Ciphertext: ${ciphertext.substring(0, 40)}${ciphertext.length > 40 ? '...' : ''}</div>
      </div>
    `;
    
    elements.inbox.insertBefore(msgDiv, elements.inbox.firstChild);
    while (elements.inbox.children.length > 50) {
      elements.inbox.removeChild(elements.inbox.lastChild);
    }
  } catch (error) {
    console.error('❌ Decryption failed:', error);
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message received card bg-light border-start border-danger border-3 p-3';
    msgDiv.innerHTML = `
      <div class="fw-bold text-danger fs-6 mb-1">${from}</div>
      <div class="text-danger mb-2">⚠️ Failed to decrypt message</div>
      <div class="small text-danger">Error: ${error.message}</div>
    `;
    elements.inbox.insertBefore(msgDiv, elements.inbox.firstChild);
  }
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
  alert('Connection error. Please refresh and try again.');
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}