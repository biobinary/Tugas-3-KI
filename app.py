import eventlet
from static.RSA import key_to_string, string_to_key 
import secrets
import string

eventlet.monkey_patch()

from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'replace-this-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

users = {}

def generate_random_key(length=8):
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('register')
def handle_register(data):

    username = data.get('username')
    public_key_str = data.get('public_key') 
    sid = request.sid
    
    if not username:
        emit('register_response', {'ok': False, 'error': 'username required'})
        return
        
    if not public_key_str:
        emit('register_response', {'ok': False, 'error': 'public key required'})
        return
    
    if username in users:
        emit('register_response', {'ok': False, 'error': 'username already taken'})
        return

    try:
        public_key = string_to_key(public_key_str)
    except Exception as e:
        emit('register_response', {'ok': False, 'error': 'invalid public key format'})
        return

    users[username] = {
        'sid': sid,
        'public_key': public_key
    }
    
    join_room(username)
    
    broadcast_users()
    
    emit('register_response', {
        'ok': True,
    })

    print(f"[REGISTER] {username} (sid={sid})")
    print(f"  Public Key: {public_key}")

@socketio.on('send_message') 
def handle_send_message(data):
    
    frm = data.get('from')
    to = data.get('to')
    
    encrypted_key = data.get('encrypted_key')
    ciphertext = data.get('ciphertext')

    if not frm or not to or not encrypted_key or not ciphertext:
        emit('send_ack', {'ok': False, 'error': 'bad payload'})
        return

    if to not in users or frm not in users:
        emit('send_ack', {'ok': False, 'error': 'sender/recipient offline or unknown'})
        return

    socketio.emit('receive_message', {
        'from': frm,
        'encrypted_key': encrypted_key,
        'ciphertext': ciphertext,
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