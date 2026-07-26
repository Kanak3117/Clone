import logging
logging.basicConfig(level=logging.DEBUG)

from fastapi.testclient import TestClient
from app.main import app
import time

client = TestClient(app)

alice_login = client.post("/auth/login", json={"identifier": "alice", "otp": "123456"})
alice_token = client.get("/auth/ws-token", cookies=alice_login.cookies).json()["token"]

bob_login = client.post("/auth/login", json={"identifier": "bob", "otp": "123456"})
bob_token = client.get("/auth/ws-token", cookies=bob_login.cookies).json()["token"]

convos = client.get("/conversations", cookies=alice_login.cookies).json()
dm_id = None
for c in convos:
    if c["type"] == "direct":
        if any(p["username"] == "bob" for p in c["participants"]):
            dm_id = c["id"]
            break

with client.websocket_connect(f"/ws?token={alice_token}") as ws_alice:
    with client.websocket_connect(f"/ws?token={bob_token}") as ws_bob:
        
        ws_bob.send_json({
            "type": "typing:start",
            "conversation_id": dm_id,
        })

        time.sleep(1)

        print("Trying to read from alice...")
        try:
            msg = ws_alice.receive_json()
            print("Alice received:", msg)
        except Exception as e:
            print("Alice error:", e)
