import eventlet
from DES import encrypt_buffer, decrypt_buffer, pad_text

eventlet.monkey_patch()

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room    

app = Flask(__name__)
app.config['SECRET_KEY'] = 'replace-this-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

users = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('register')
def handle_register(data):
    
    username = data.get('username')
    key = data.get('key')
    sid = request.sid
    
    if not username or not key:
        emit('register_response', {'ok': False, 'error': 'username & key required'})
        return
    
    if username in users:
        emit('register_response', {'ok': False, 'error': 'username already taken'})
        return

    key_fixed = pad_text(key)[:8]

    users[username] = {'sid': sid, 'key': key_fixed}
    join_room(username)
    socketio.emit('users', list(users.keys()))
    emit('register_response', {'ok': True})

    print(f"[REGISTER] {username} (sid={sid})")

@socketio.on('send_plain') 
def handle_send_plain(data):
    frm = data.get('from')
    to = data.get('to')
    plaintext = data.get('message')

    if not frm or not to or plaintext is None:
        emit('send_ack', {'ok': False, 'error': 'bad payload'})
        return

    if to not in users or frm not in users:
        emit('send_ack', {'ok': False, 'error': 'sender/recipient offline or unknown'})
        return
    
    sender_key = users[frm]['key']
    ciphertext = encrypt_buffer(plaintext, sender_key)
    
    recv_key = users[to]['key']
    try:
        decrypted = decrypt_buffer(ciphertext, recv_key) 
    except Exception as e:
        decrypted = "(decrypt failed on server)"

    socketio.emit('receive_message', {
        'from': frm,
        'ciphertext': ciphertext,
        'plaintext': decrypted
    }, room=to)

    emit('send_ack', {'ok': True, 'ciphertext': ciphertext})
    print(f"[RELAY] {frm} -> {to} (cipher len={len(ciphertext)})")

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
    
    socketio.emit('users', list(users.keys()))

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)