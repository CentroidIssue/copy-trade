from config.public import *
import httpx, time

url = f"http://{IP}:8000/checkNewOrder"
client = httpx.Client()

while True:
    response = client.get(url, timeout=10)
    print("Data received")