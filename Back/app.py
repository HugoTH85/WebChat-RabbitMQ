from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.websockets import WebSocket, WebSocketDisconnect
import pika
import threading
import time
from typing import List
from pydantic import BaseModel
from socketio import ASGIApp
import socketio

app = FastAPI()

# Setup RabbitMQ
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()
exchange = 'direct_exchange'

class ChatMessage(BaseModel):
    message: str
    user: str

def setup_queue(user_queue: str, routing_key_receive: str):
    channel.exchange_declare(exchange=exchange, exchange_type='direct', durable=False)
    channel.queue_declare(queue=user_queue, durable=False)
    channel.queue_bind(queue=user_queue, exchange=exchange, routing_key=routing_key_receive)

def receive_messages(user_queue: str, routing_key_receive: str, sio):
    def callback(ch, method, properties, body):
        timestamp = time.strftime('%H:%M:%S')
        message = body.decode()
        sio.emit('receive_message', {'msg': message, 'time': timestamp, 'user': routing_key_receive.split('_')[0]}, broadcast=True)

    channel.basic_consume(queue=user_queue, on_message_callback=callback, auto_ack=True)
    channel.start_consuming()

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi')
sio_app = ASGIApp(sio, app)

@app.on_event("startup")
async def startup_event():
    # Configure the RabbitMQ queue based on the user
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
    threading.Thread(target=receive_messages, args=(user_queue, routing_key_receive, sio), daemon=True).start()

@app.get("/", response_class=HTMLResponse)
async def get_chat_page(request: Request):
    user = request.query_params.get('user', 'user1')
    return HTMLResponse(content=open('templates/chat.html').read(), media_type='text/html')

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def send_message(sid, data: ChatMessage):
    message = data.message
    user = data.user
    timestamp = time.strftime('%H:%M:%S')
    if user == 'user1':
        routing_key = 'user2_key'
    else:
        routing_key = 'user1_key'
    channel.basic_publish(exchange=exchange, routing_key=routing_key, body=message)
    await sio.emit('receive_message', {'msg': message, 'time': timestamp, 'user': user}, room=sid)

# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount the Socket.IO ASGI application
app.mount("/ws", sio_app)
