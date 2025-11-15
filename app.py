import eventlet
from DES import encrypt_buffer, decrypt_buffer, pad_text
from RSA import generate_keypair, encrypt_rsa, decrypt_rsa, key_to_string, string_to_key
import secrets
import string

eventlet.monkey_patch()

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room    

app = Flask(__name__)
app.config['SECRET_KEY'] = 'replace-this-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

users = {}

def generate_random_key(length=8):
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('register')
def handle_register(data):
    username = data.get('username')
    sid = request.sid
    
    if not username:
        emit('register_response', {'ok': False, 'error': 'username required'})
        return
    
    if username in users:
        emit('register_response', {'ok': False, 'error': 'username already taken'})
        return

    print(f"[REGISTER] Generating RSA keypair for {username}...")
    public_key, private_key = generate_keypair(bits=16)
    
    users[username] = {
        'sid': sid,
        'public_key': public_key,
        'private_key': private_key
    }
    
    join_room(username)
    
    broadcast_users()
    
    emit('register_response', {
        'ok': True,
        'public_key': key_to_string(public_key),
        'private_key': key_to_string(private_key)
    })

    print(f"[REGISTER] {username} (sid={sid})")
    print(f"  Public Key: {public_key}")

@socketio.on('send_message') 
def handle_send_message(data):

    frm = data.get('from')
    to = data.get('to')
    plaintext = data.get('message')

    if not frm or not to or plaintext is None:
        emit('send_ack', {'ok': False, 'error': 'bad payload'})
        return

    if to not in users or frm not in users:
        emit('send_ack', {'ok': False, 'error': 'sender/recipient offline or unknown'})
        return
    
    des_key = generate_random_key(8)
    print(f"[ENCRYPT] Generated DES key: {des_key}")
    
    recipient_public_key = users[to]['public_key']
    encrypted_des_key = encrypt_rsa(des_key, recipient_public_key)
    print(f"[ENCRYPT] Encrypted DES key with recipient's public key")
    
    ciphertext = encrypt_buffer(plaintext, des_key)
    print(f"[ENCRYPT] Encrypted message with DES")
    
    socketio.emit('receive_message', {
        'from': frm,
        'encrypted_key': encrypted_des_key,
        'ciphertext': ciphertext,
        'plaintext': None
    }, room=to)

    emit('send_ack', {'ok': True})
    print(f"[RELAY] {frm} -> {to} (cipher len={len(ciphertext)})")

def broadcast_users():
    user_list = []
    for username, info in users.items():
        user_list.append({
            'username': username,
            'public_key': key_to_string(info['public_key'])
        })
    
    socketio.emit('users', user_list)

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    removed = None
    
    for u, info in list(users.items()):
        if info['sid'] == sid:
            removed = u
            del users[u]
            break

    if removed:
        print(f"[DISCONNECT] {removed}")
    
    broadcast_users()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)