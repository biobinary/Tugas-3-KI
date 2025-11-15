// static/script.js
const socket = io();
let username = null;
let key = null;

// Cache DOM elements
const elements = {
  login: null,
  chat: null,
  username: null,
  key: null,
  users: null,
  message: null,
  inbox: null,
  me: null
};

// Initialize DOM elements when page loads
document.addEventListener('DOMContentLoaded', () => {
  elements.login = document.getElementById('login');
  elements.chat = document.getElementById('chat');
  elements.username = document.getElementById('username');
  elements.key = document.getElementById('key');
  elements.users = document.getElementById('users');
  elements.message = document.getElementById('message');
  elements.inbox = document.getElementById('inbox');
  elements.me = document.getElementById('me');
});

document.getElementById('btnRegister').onclick = () => {
  const u = elements.username.value.trim();
  const k = elements.key.value;
  
  if (!u || !k) {
    alert('Username & key required');
    return;
  }
  
  username = u;
  key = k;
  socket.emit('register', { username, key });
};

document.getElementById('btnLogout').onclick = () => {
  socket.disconnect();
  location.reload();
};

document.getElementById('btnSend').onclick = () => {
  sendMessage();
};

// Add Enter key support for message textarea
document.getElementById('message').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const to = elements.users.value;
  const msg = elements.message.value.trim();
  
  if (!to) {
    alert('Select recipient');
    return;
  }
  
  if (!msg) {
    alert('Type message');
    return;
  }

  socket.emit('send_plain', { from: username, to, message: msg });
  elements.message.value = '';
}

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('register_response', (data) => {
  if (data.ok) {
    elements.login.style.display = 'none';
    elements.chat.style.display = 'block';
    elements.me.textContent = username;
  } else {
    alert('Register failed: ' + (data.error || 'unknown'));
  }
});

socket.on('users', (list) => {
  const sel = elements.users;
  const prevValue = sel.value;
  
  // Clear and rebuild options
  sel.innerHTML = '';
  
  const availableUsers = list.filter(u => u !== username);
  
  if (availableUsers.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No users online';
    opt.disabled = true;
    sel.appendChild(opt);
  } else {
    availableUsers.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      sel.appendChild(opt);
    });
    
    // Restore previous selection if still available
    if (prevValue && availableUsers.includes(prevValue)) {
      sel.value = prevValue;
    }
  }
});

socket.on('send_ack', (data) => {
  if (!data.ok) {
    alert('Send failed: ' + (data.error || 'unknown'));
  }
});

socket.on('receive_message', (data) => {
  const { from, ciphertext, plaintext } = data;
  
  const div = document.createElement('div');
  div.className = 'msg';
  
  const fromEl = document.createElement('b');
  fromEl.textContent = from;
  
  const textNode = document.createTextNode(': ' + plaintext);
  
  const br = document.createElement('br');
  
  const small = document.createElement('small');
  small.textContent = 'cipher: ' + ciphertext;
  
  div.appendChild(fromEl);
  div.appendChild(textNode);
  div.appendChild(br);
  div.appendChild(small);
  
  elements.inbox.prepend(div);
  
  // Limit inbox to 50 messages to prevent performance issues
  while (elements.inbox.children.length > 50) {
    elements.inbox.removeChild(elements.inbox.lastChild);
  }
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  alert('Connection error. Please try again.');
});