import pika
import threading
import time
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import socketio

# Initialisation de l'application FastAPI et du serveur Socket.IO
app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup RabbitMQ
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()
exchange = 'direct_exchange'

# Configuration de Socket.IO avec FastAPI
sio_app = socketio.ASGIApp(sio, app)
app.mount("/socket.io/", sio_app)

class ChatMessage(BaseModel):
    message: str
    user: str

def setup_queue(user_queue: str, routing_key_receive: str):
    channel.exchange_declare(exchange=exchange, exchange_type='direct', durable=False)
    channel.queue_declare(queue=user_queue, durable=False)
    channel.queue_bind(queue=user_queue, exchange=exchange, routing_key=routing_key_receive)

def receive_messages(user_queue: str, routing_key_receive: str):
    def callback(ch, method, properties, body):
        timestamp = time.strftime('%H:%M:%S')
        message = body.decode()
        # Envoyer le message à tous les clients connectés
        sio.emit('receive_message', {'msg': message, 'time': timestamp, 'user': routing_key_receive.split('_')[0]}, namespace='/')

    channel.basic_consume(queue=user_queue, on_message_callback=callback, auto_ack=True)
    channel.start_consuming()

@app.on_event("startup")
async def startup_event():
    user = input("Enter 'user1' or 'user2': ").strip().lower()
    if user == 'user1':
        user_queue = 'user1_queue'
        routing_key_receive = 'user1_key'
    elif user == 'user2':
        user_queue = 'user2_queue'
        routing_key_receive = 'user2_key'
    else:
        print("Invalid user. Please restart and enter 'user1' or 'user2'.")
        connection.close()
        exit(1)

    setup_queue(user_queue, routing_key_receive)
    threading.Thread(target=receive_messages, args=(user_queue, routing_key_receive), daemon=True).start()

@app.get("/", response_class=HTMLResponse)
async def get_chat_page(request: Request):
    return HTMLResponse(content=open('templates/chat.html').read(), media_type='text/html')

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def send_message(sid, data):
    message = data['message']
    user = data['user']
    timestamp = time.strftime('%H:%M:%S')
    
    # Définir la clé de routage pour RabbitMQ
    routing_key = 'user2_key' if user == 'user1' else 'user1_key'
    
    # Envoyer le message à RabbitMQ
    channel.basic_publish(exchange=exchange, routing_key=routing_key, body=message)
    
    # Envoyer le message à tous les clients connectés
    await sio.emit('receive_message', {'msg': message, 'time': timestamp, 'user': user}, broadcast=True)

