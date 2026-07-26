import urllib.request, urllib.error, json

API = "https://signal-clone-api-myo1.onrender.com"


def post_login():
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
        return token
    except urllib.error.HTTPError as e:
        print("LOGIN ERROR:", e.code)
        try:
            print(e.read().decode())
        except Exception:
            pass
        return None
    except Exception as e:
        print("LOGIN EXCEPTION:", e)
        return None


def get_me(token):
    req = urllib.request.Request(API + "/auth/me", headers={"Authorization": f"Bearer {token}"})
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        print("ME STATUS:", resp.getcode())
        print(resp.read().decode())
    except urllib.error.HTTPError as e:
        print("ME ERROR:", e.code)
        try:
            print(e.read().decode())
        except Exception:
            pass
    except Exception as e:
        print("ME EXCEPTION:", e)


if __name__ == "__main__":
    t = post_login()
    if t:
        get_me(t)
