
if (!window.appCrypto) {
  alert("FATAL ERROR: crypto.js gagal di-load.");
  throw new Error("crypto.js not loaded");
}

const socket = io();
const crypto = window.appCrypto;

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
  
  document.getElementById('btnRegister').addEventListener('click', () => {
    const u = elements.username.value.trim();
    if (!u) {
      alert('Username required');
      return;
    }
    username = u;
    
    console.log("Membuat RSA key pair (16-bit)...");
    const keys = crypto.generateRSAKeyPair(16);
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    
    console.log("Public Key (Lokal):", publicKey);
    console.log("Private Key (Lokal):", privateKey);

    socket.emit('register', { 
      username: username,
      public_key: crypto.keyToString(publicKey)
    });
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
    updateRecipientKeyDisplay();
  });
});

function updateRecipientKeyDisplay() {
  const selectedUser = elements.users.value;
  if (selectedUser && userPublicKeys[selectedUser]) {
    elements.recipientKeyDisplay.innerHTML = 
      `<strong>Recipient's Public Key:</strong> <code class="bg-success-subtle p-1 rounded small">${userPublicKeys[selectedUser]}</code>`;
  } else {
    elements.recipientKeyDisplay.innerHTML = '';
  }
}

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

  try {

    const recipientKeyStr = userPublicKeys[to];
    if (!recipientKeyStr) {
      alert("Tidak dapat menemukan kunci publik untuk " + to);
      return;
    }
    const recipientPublicKey = crypto.stringToKey(recipientKeyStr);

    const desKey = crypto.generateRandomKey(8);
    console.log("Membuat DES key:", desKey);

    const encryptedDesKey = crypto.encryptRSA(desKey, recipientPublicKey);
    console.log("Kunci DES terenkripsi (dengan RSA):", encryptedDesKey);

    const desCiphertext = crypto.encryptDES(msg, desKey);
    console.log("Ciphertext (dengan DES):", desCiphertext.substring(0, 20) + "...");

    socket.emit('send_message', { 
      from: username, 
      to: to, 
      encrypted_key: encryptedDesKey,
      ciphertext: desCiphertext     
    });
    
    elements.message.value = '';
    
  } catch (error) {
    console.error("Kesalahan saat enkripsi:", error);
    alert("Gagal mengenkripsi pesan: " + error.message);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('register_response', (data) => {
  
  if (data.ok) {

    elements.loginSection.classList.add('d-none');
    elements.keysSection.classList.remove('d-none');
    elements.chatSection.classList.remove('d-none');
    elements.emptyState.classList.add('d-none');
    
    elements.me.textContent = username;
    elements.userAvatar.textContent = username.charAt(0).toUpperCase();
    
    const pubKeyText = document.createTextNode(crypto.keyToString(publicKey));
    const privKeyText = document.createTextNode(crypto.keyToString(privateKey));
    
    elements.publicKeyDisplay.insertBefore(pubKeyText, elements.publicKeyDisplay.firstChild);
    elements.privateKeyDisplay.insertBefore(privKeyText, elements.privateKeyDisplay.firstChild);
    
    console.log('✅ Registered successfully (E2EE Client-side)');
    
    if (window.innerWidth < 768) {
      elements.sidebar.hide();
    }
  } else {
    alert('Registration failed: ' + (data.error || 'unknown error'));
    username = null;
    publicKey = null;
    privateKey = null;
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
    } else if (availableUsers.length > 0) {
      sel.value = availableUsers[0].username;
    }
  }
  updateRecipientKeyDisplay();
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

    const desKey = crypto.decryptRSA(encrypted_key, privateKey);
    console.log('🔓 Decrypted DES key:', desKey);
    
    const plaintext = crypto.decryptDES(ciphertext, desKey);
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