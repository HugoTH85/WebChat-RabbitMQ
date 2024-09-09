import tkinter as tk
from tkinter import scrolledtext
import threading
import pika
import time
import sys

class ChatApp:
    def __init__(self, root, user, exchange, routing_key_send, routing_key_receive):
        self.root = root
        self.user = user
        self.exchange = exchange
        self.routing_key_send = routing_key_send
        self.routing_key_receive = routing_key_receive

        self.root.title(f"{self.user} Chat")
        self.root.geometry('400x400')

        # Chat display area
        self.chat_display = scrolledtext.ScrolledText(self.root, wrap=tk.WORD)
        self.chat_display.pack(padx=10, pady=10, fill=tk.BOTH, expand=True)
        self.chat_display.config(state=tk.DISABLED)

        # Message input area
        self.message_entry = tk.Entry(self.root)
        self.message_entry.pack(padx=10, pady=10, fill=tk.X)
        self.message_entry.bind("<Return>", self.send_message)

        # Start RabbitMQ connection
        self.connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
        self.channel = self.connection.channel()
        self.channel.exchange_declare(exchange=self.exchange, exchange_type='direct', durable=False)
        self.queue = f"{self.user}_queue"
        self.channel.queue_declare(queue=self.queue, durable=False)
        self.channel.queue_bind(queue=self.queue, exchange=self.exchange, routing_key=self.routing_key_receive)

        # Start a thread to receive messages
        self.receive_thread = threading.Thread(target=self.receive_messages)
        self.receive_thread.start()

    def send_message(self, event=None):
        message = self.message_entry.get()
        if message.strip():
            timestamp = time.strftime('%H:%M:%S')
            self.chat_display.config(state=tk.NORMAL)
            self.chat_display.insert(tk.END, f"You [{timestamp}]: {message}\n")
            self.chat_display.yview(tk.END)
            self.chat_display.config(state=tk.DISABLED)
            self.message_entry.delete(0, tk.END)
            self.channel.basic_publish(exchange=self.exchange, routing_key=self.routing_key_send, body=message)

    def receive_messages(self):
        def callback(ch, method, properties, body):
            timestamp = time.strftime('%H:%M:%S')
            message = body.decode()
            self.chat_display.config(state=tk.NORMAL)
            self.chat_display.insert(tk.END, f"{self.routing_key_receive.split('_')[0].capitalize()} [{timestamp}]: {message}\n")
            self.chat_display.yview(tk.END)
            self.chat_display.config(state=tk.DISABLED)

        self.channel.basic_consume(queue=self.queue, on_message_callback=callback, auto_ack=True)
        self.channel.start_consuming()

    def on_closing(self):
        self.connection.close()
        self.root.quit()

if __name__ == "__main__":
    root = tk.Tk()

    # Select user (user1 or user2)
    user = input("Enter 'user1' or 'user2': ").strip().lower()

    if user == 'user1':
        app = ChatApp(root, user='user1', exchange='direct_exchange', routing_key_send='user2_key', routing_key_receive='user1_key')
    elif user == 'user2':
        app = ChatApp(root, user='user2', exchange='direct_exchange', routing_key_send='user1_key', routing_key_receive='user2_key')
    else:
        print("Invalid user. Please run the script again and enter 'user1' or 'user2'.")
        sys.exit(0)

    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
