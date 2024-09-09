import pika
import threading
import sys
import time

def start_user2():
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()
    
    exchange = 'direct_exchange'
    queue = 'user2_queue'

    channel.exchange_declare(exchange=exchange, exchange_type='direct', durable=False)
    channel.queue_declare(queue=queue, durable=False)
    channel.queue_bind(queue=queue, exchange=exchange, routing_key='user1_key')

    def send_message():
        while True:
            message = input("Send message to user1 (or 'exit' to quit): ")
            if message.strip().lower() == 'exit':
                connection.close()
                sys.exit(0)
            else:
                timestamp = time.strftime('%H:%M:%S')
                print(f"[User1 Received Message][{timestamp}]: {message}")
                channel.basic_publish(exchange=exchange, routing_key='user2_key', body=message)

    def receive_message():
        def callback(ch, method, properties, body):
            timestamp = time.strftime('%H:%M:%S')
            print(f"\rMsg received from User1 [{timestamp}]: {body.decode()}")
            print("Send message to user1 (or 'exit' to quit): ", end='', flush=True)

        channel.basic_consume(queue=queue, on_message_callback=callback, auto_ack=True)
        print("Waiting for messages...")
        channel.start_consuming()

    # Run the send and receive functions concurrently
    sender_thread = threading.Thread(target=send_message)
    sender_thread.start()

    receive_message()

if __name__ == "__main__":
    try:
        start_user2()
    except KeyboardInterrupt:
        print("Exiting...")