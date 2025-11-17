import asyncio
import js
from pyscript import document, fetch
from pyodide.ffi import create_proxy, to_js
import secrets
import string

# Load RSA and DES modules dynamically
RSA = None
DES = None

async def load_modules():
    """Fetch and load Python modules"""
    global RSA, DES
    
    try:
        # Fetch RSA.py
        rsa_response = await fetch("/static/RSA.py")
        rsa_code = await rsa_response.text()
        
        # Fetch DES.py  
        des_response = await fetch("/static/DES.py")
        des_code = await des_response.text()
        
        # Execute the code to create modules
        exec(rsa_code, globals())
        exec(des_code, globals())
        
        js.console.log("✅ RSA and DES modules loaded successfully")
        return True
    except Exception as e:
        js.console.error(f"❌ Failed to load modules: {e}")
        js.alert(f"Failed to load crypto modules: {e}")
        return False

# Global variables
username = None
public_key = None
private_key = None
user_public_keys = {}
socket = None

# DOM elements
el_login_section = None
el_keys_section = None
el_chat_section = None
el_empty_state = None
el_username = None
el_users = None
el_message = None
el_inbox = None
el_me = None
el_user_avatar = None
el_public_key_display = None
el_private_key_display = None
el_recipient_key_display = None
el_sidebar_js = None

def generate_random_key(length=8):
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

def escape_html(text):
    div = js.document.createElement('div')
    div.textContent = text
    return div.innerHTML

def on_register_click(event):
    global username, public_key, private_key
    
    u = el_username.value.strip()
    if not u:
        js.alert('Username required')
        return
    username = u
    
    js.console.log("Generating RSA keypair...")
    
    keys = generate_keypair(16)
    public_key = keys[0]
    private_key = keys[1]
    
    js.console.log(f"Public Key: {public_key}")

    payload = {
        'username': username,
        'public_key': key_to_string(public_key)
    }
    socket.emit('register', to_js(payload))

def on_logout_click(event):
    socket.disconnect()
    js.location.reload()

def on_send_click(event):
    global user_public_keys
    
    to = el_users.value
    msg = el_message.value.strip()
    
    if not to:
        js.alert('Please select a recipient')
        return
    if not msg:
        js.alert('Please type a message')
        return

    try:
        recipient_key_str = user_public_keys.get(to)
        if not recipient_key_str:
            js.alert(f"Cannot find public key for {to}")
            return
        
        recipient_public_key = string_to_key(recipient_key_str)
        des_key = generate_random_key(8)

        encrypted_des_key = encrypt_rsa(des_key, recipient_public_key)
        des_ciphertext = encrypt_buffer(msg, des_key)
        ciphertext_bytes = [ord(c) for c in des_ciphertext]

        payload = {
            'from': username,
            'to': to,
            'encrypted_key': encrypted_des_key,
            'ciphertext': ciphertext_bytes
        }
        
        socket.emit('send_message', to_js(payload))
        el_message.value = ''
        
    except Exception as e:
        js.console.error(f"Encryption error: {e}")
        js.alert(f"Failed to encrypt: {e}")

def on_users_dropdown_change(event):
    update_recipient_key_display()

def update_recipient_key_display():
    selected_user = el_users.value
    if selected_user and user_public_keys.get(selected_user):
        key_str = user_public_keys[selected_user]
        el_recipient_key_display.innerHTML = \
            f'<strong>Recipient\'s Public Key:</strong> <code class="bg-success-subtle p-1 rounded small">{key_str}</code>'
    else:
        el_recipient_key_display.innerHTML = ''

def on_socket_connect():
    js.console.log('✅ Connected to server')

def on_register_response(data_js):
    global username, public_key, private_key
    data = data_js.to_py()
    
    if data.get('ok'):
        el_login_section.classList.add('d-none')
        el_keys_section.classList.remove('d-none')
        el_chat_section.classList.remove('d-none')
        el_empty_state.classList.add('d-none')
        
        el_me.textContent = username
        el_user_avatar.textContent = username[0].upper()
        
        pub_key_str = key_to_string(public_key)
        priv_key_str = key_to_string(private_key)
        
        el_public_key_display.insertBefore(
            js.document.createTextNode(pub_key_str),
            el_public_key_display.firstChild
        )
        el_private_key_display.insertBefore(
            js.document.createTextNode(priv_key_str),
            el_private_key_display.firstChild
        )
        
        js.console.log('✅ Registered successfully')
        
        if js.window.innerWidth < 768:
            el_sidebar_js.hide()
            
    else:
        js.alert(f"Registration failed: {data.get('error')}")
        username, public_key, private_key = None, None, None

def on_users_list(list_js):
    global user_public_keys
    user_list = list_js.to_py()
    sel = el_users
    prev_value = sel.value
    sel.innerHTML = ''
    user_public_keys = {}
    
    available_users = [u for u in user_list if u['username'] != username]
    
    if not available_users:
        sel.innerHTML = '<option disabled>No users online</option>'
    else:
        for u in available_users:
            user_public_keys[u['username']] = u['public_key']
            opt = js.document.createElement('option')
            opt.value = u['username']
            opt.textContent = u['username']
            sel.appendChild(opt)
        
        if prev_value in [u['username'] for u in available_users]:
            sel.value = prev_value
        elif available_users:
            sel.value = available_users[0]['username']
            
    update_recipient_key_display()

def on_send_ack(data_js):
    data = data_js.to_py()
    if not data.get('ok'):
        js.alert(f"Failed to send: {data.get('error')}")
    else:
        js.console.log('✅ Message sent')

def on_receive_message(data_js):
    data = data_js.to_py()
    js.console.log(f"📨 Message from: {data.get('from')}")
    
    try:
        encrypted_key = data['encrypted_key']
        ciphertext = data['ciphertext']
        frm = data['from']
        
        ciphertext_str = "".join(chr(b) for b in ciphertext)
        des_key = decrypt_rsa(encrypted_key, private_key)
        plaintext = decrypt_buffer(ciphertext_str, des_key)
        
        msg_div = js.document.createElement('div')
        msg_div.className = 'message received card bg-light border-start border-success border-3 p-3'
        
        msg_div.innerHTML = f"""
          <div class="badge bg-success mb-2">✅ Decrypted</div>
          <div class="fw-bold text-success fs-6 mb-1">{frm}</div>
          <div class="message-content mb-2">{escape_html(plaintext)}</div>
          <div class="small text-muted">
            <div>DES Key (encrypted): {str(encrypted_key[:3])}...</div>
            <div>Ciphertext: {str(ciphertext[:5])}...</div>
          </div>
        """
        
        el_inbox.insertBefore(msg_div, el_inbox.firstChild)
        
        while el_inbox.children.length > 50:
            el_inbox.removeChild(el_inbox.lastChild)

    except Exception as e:
        js.console.error(f'❌ Decryption failed: {e}')
        msg_div = js.document.createElement('div')
        msg_div.className = 'message received card bg-light border-start border-danger border-3 p-3'
        msg_div.innerHTML = f"""
          <div class="fw-bold text-danger fs-6 mb-1">{data.get('from')}</div>
          <div class="text-danger mb-2">⚠️ Failed to decrypt</div>
          <div class="small text-danger">Error: {e}</div>
        """
        el_inbox.insertBefore(msg_div, el_inbox.firstChild)

def on_socket_disconnect():
    js.console.log('❌ Disconnected')

def on_connect_error(error_js):
    js.console.error(f'❌ Connection error: {error_js}')
    js.alert('Connection error. Please refresh.')

async def main():
    global socket
    global el_login_section, el_keys_section, el_chat_section, el_empty_state
    global el_username, el_users, el_message, el_inbox, el_me, el_user_avatar
    global el_public_key_display, el_private_key_display, el_recipient_key_display
    global el_sidebar_js

    js.console.log("PyScript initializing...")

    # Load modules first
    if not await load_modules():
        return

    # Get DOM elements
    try:
        el_login_section = document.getElementById('login-section')
        el_keys_section = document.getElementById('keys-section')
        el_chat_section = document.getElementById('chat-section')
        el_empty_state = document.getElementById('empty-state')
        el_username = document.getElementById('username')
        el_users = document.getElementById('users')
        el_message = document.getElementById('message')
        el_inbox = document.getElementById('inbox')
        el_me = document.getElementById('me')
        el_user_avatar = document.getElementById('userAvatar')
        el_public_key_display = document.getElementById('publicKeyDisplay')
        el_private_key_display = document.getElementById('privateKeyDisplay')
        el_recipient_key_display = document.getElementById('recipientKeyDisplay')
        js.console.log("✅ DOM elements ready")
    except Exception as e:
        js.console.error(f"DOM error: {e}")
        return

    # Initialize JS objects
    try:
        el_sidebar_js = js.bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('sidebarOffcanvas'))
        socket = js.io()
        js.console.log("✅ JS libraries ready")
    except Exception as e:
        js.console.error(f"JS error: {e}")
        return

    # Attach event listeners
    try:
        document.getElementById('btnRegister').addEventListener('click', create_proxy(on_register_click))
        document.getElementById('btnLogout').addEventListener('click', create_proxy(on_logout_click))
        document.getElementById('btnSend').addEventListener('click', create_proxy(on_send_click))
        el_users.addEventListener('change', create_proxy(on_users_dropdown_change))
        
        def on_message_keydown(event):
            if event.key == 'Enter' and event.ctrlKey:
                event.preventDefault()
                on_send_click(event)
                
        el_message.addEventListener('keydown', create_proxy(on_message_keydown))
        
        js.console.log("✅ Event listeners attached")
    except Exception as e:
        js.console.error(f"Event error: {e}")
        return

    # Socket.IO handlers
    try:
        socket.on('connect', create_proxy(on_socket_connect))
        socket.on('register_response', create_proxy(on_register_response))
        socket.on('users', create_proxy(on_users_list))
        socket.on('send_ack', create_proxy(on_send_ack))
        socket.on('receive_message', create_proxy(on_receive_message))
        socket.on('disconnect', create_proxy(on_socket_disconnect))
        socket.on('connect_error', create_proxy(on_connect_error))
        
        js.console.log("✅ Socket handlers attached")
        js.console.log("🚀 Application ready!")
    except Exception as e:
        js.console.error(f"Socket error: {e}")

asyncio.ensure_future(main())