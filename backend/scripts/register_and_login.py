import urllib.request, urllib.error, json

API = "https://signal-clone-api-myo1.onrender.com"


def register():
    data = json.dumps({"username": "alice", "display_name": "Alice", "phone_number": None, "avatar_url": None}).encode()
    req = urllib.request.Request(API + "/auth/register", data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        print("REGISTER STATUS:", resp.getcode())
        print(resp.read().decode())
    except urllib.error.HTTPError as e:
        print("REGISTER ERROR:", e.code)
        try:
            print(e.read().decode())
        except Exception:
            pass


def login_and_me():
    data = json.dumps({"identifier": "alice", "otp": "123456"}).encode()
    req = urllib.request.Request(API + "/auth/login", data=data, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        body = resp.read().decode()
        print("LOGIN STATUS:", resp.getcode())
        print(body)
        obj = json.loads(body)
        token = obj.get("token")
        print("TOKEN:", token)
        if token:
            req2 = urllib.request.Request(API + "/auth/me", headers={"Authorization": f"Bearer {token}"})
            resp2 = urllib.request.urlopen(req2, timeout=15)
            print("ME STATUS:", resp2.getcode())
            print(resp2.read().decode())
    except urllib.error.HTTPError as e:
        print("LOGIN ERROR:", e.code)
        try:
            print(e.read().decode())
        except Exception:
            pass


if __name__ == "__main__":
    register()
    login_and_me()
