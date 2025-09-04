import time
import requests
import grpc
import websocket
import json
import ping_pb2
import ping_pb2_grpc
from google.protobuf import empty_pb2
import ssl

REST_URL = "http://localhost:3000/ping"
GRPC_HOST = "localhost:50051"
WEBSOCKET_URL = "wss://localhost:8443?token=12345" 

# Uji REST API
def test_rest():
    print("Testing REST...")
    start = time.time()
    for _ in range(10):
        r = requests.get(REST_URL)
        r.raise_for_status()
    end = time.time()
    print(f"REST time: {end - start:.4f} seconds")

# Uji gRPC
def test_grpc():
    print("Testing gRPC...")
    channel = grpc.insecure_channel(GRPC_HOST)
    stub = ping_pb2_grpc.PingServiceStub(channel)
    start = time.time()
    for _ in range(10):
        stub.Ping(empty_pb2.Empty())
    end = time.time()
    print(f"gRPC time: {end - start:.4f} seconds")

# Uji WebSocket
def test_ws():
    print("Testing WebSocket...")
    ws = websocket.create_connection(
        WEBSOCKET_URL,
        sslopt={"cert_reqs": ssl.CERT_NONE}
    )
    start = time.time()
    for _ in range(10):
        ws.send(json.dumps({"type": "ping"}))
        while True:
            result = ws.recv()
            data = json.loads(result)
            if data.get("type") == "pong":
                break
    end = time.time()
    print(f"WebSocket time: {end - start:.4f} seconds")
    ws.close()

if __name__ == "__main__":
    test_rest()
    test_grpc()
    test_ws()
