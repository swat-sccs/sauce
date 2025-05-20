#Test: used to send test requests to the rabbit mq server
import pika
import sys
import json
from dotenv import load_dotenv
import os

load_dotenv()

user = os.getenv("RABBITMQ_DEFAULT_USER")
passwd = os.getenv("RABBITMQ_DEFAULT_PASS")
host = os.getenv("RABBITMQ_HOST")

credentials = pika.PlainCredentials(user, passwd)

connection = pika.BlockingConnection(
    pika.ConnectionParameters(host=host, credentials=credentials))
channel = connection.channel()

channel.queue_declare(queue='discord', durable=True)

message = '{"username":"user","email":"user@swarthmore.edu","classYear":"2027","name":"user", "url":"https://sccs.swarthmore.edu"}'
channel.basic_publish(
    exchange='',
    routing_key='discord',
    body=message,
    properties=pika.BasicProperties(
        delivery_mode=pika.DeliveryMode.Persistent
    ))
print(f" [x] Sent {message}")
connection.close()