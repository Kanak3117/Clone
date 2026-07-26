"""Smoke tests for the Signal Clone backend API."""

import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app
from app.seed import seed


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    """Drop and recreate all tables, then seed for tests."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed()
    yield
    # Cleanup is optional — tests use a fresh seed each module


client = TestClient(app)


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------
class TestAuth:
    def test_register_new_user(self):
        resp = client.post(
            "/auth/register",
            json={
                "username": "testuser",
                "display_name": "Test User",
                "phone_number": "+9999999999",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["username"] == "testuser"
        assert data["display_name"] == "Test User"

    def test_register_duplicate_username(self):
        resp = client.post(
            "/auth/register",
            json={"username": "alice", "display_name": "Another Alice"},
        )
        assert resp.status_code == 409

    def test_login_success(self):
        resp = client.post(
            "/auth/login",
            json={"identifier": "alice", "otp": "123456"},
        )
        assert resp.status_code == 200
        assert "session_token" in resp.cookies

    def test_login_wrong_otp(self):
        resp = client.post(
            "/auth/login",
            json={"identifier": "alice", "otp": "000000"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_user(self):
        resp = client.post(
            "/auth/login",
            json={"identifier": "nonexistent", "otp": "123456"},
        )
        assert resp.status_code == 404

    def test_me_authenticated(self):
        # Login first
        login_resp = client.post(
            "/auth/login",
            json={"identifier": "alice", "otp": "123456"},
        )
        cookies = login_resp.cookies

        resp = client.get("/auth/me", cookies=cookies)
        assert resp.status_code == 200
        assert resp.json()["username"] == "alice"

    def test_me_unauthenticated(self):
        client.cookies.clear()
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_ws_token(self):
        login_resp = client.post(
            "/auth/login",
            json={"identifier": "alice", "otp": "123456"},
        )
        cookies = login_resp.cookies

        resp = client.get("/auth/ws-token", cookies=cookies)
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_logout(self):
        login_resp = client.post(
            "/auth/login",
            json={"identifier": "alice", "otp": "123456"},
        )
        cookies = login_resp.cookies

        resp = client.post("/auth/logout", cookies=cookies)
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Conversations & Messages tests
# ---------------------------------------------------------------------------
class TestConversations:
    def _login_as(self, username: str):
        resp = client.post(
            "/auth/login",
            json={"identifier": username, "otp": "123456"},
        )
        return resp.cookies

    def test_list_conversations(self):
        cookies = self._login_as("alice")
        resp = client.get("/conversations", cookies=cookies)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_conversation(self):
        cookies = self._login_as("alice")
        convos = client.get("/conversations", cookies=cookies).json()
        first = convos[0]

        resp = client.get(f"/conversations/{first['id']}", cookies=cookies)
        assert resp.status_code == 200
        assert resp.json()["id"] == first["id"]

    def test_send_and_retrieve_message(self):
        cookies = self._login_as("alice")
        convos = client.get("/conversations", cookies=cookies).json()
        conv_id = convos[0]["id"]

        # Send
        send_resp = client.post(
            f"/conversations/{conv_id}/messages",
            json={"content": "Hello from test!"},
            cookies=cookies,
        )
        assert send_resp.status_code == 201
        msg = send_resp.json()
        assert msg["content"] == "Hello from test!"

        # Retrieve
        list_resp = client.get(
            f"/conversations/{conv_id}/messages",
            cookies=cookies,
        )
        assert list_resp.status_code == 200
        messages = list_resp.json()["messages"]
        assert any(m["content"] == "Hello from test!" for m in messages)

    def test_mark_as_read(self):
        cookies = self._login_as("bob")
        convos = client.get("/conversations", cookies=cookies).json()
        if convos:
            conv_id = convos[0]["id"]
            resp = client.post(f"/conversations/{conv_id}/read", cookies=cookies)
            assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Contacts tests
# ---------------------------------------------------------------------------
class TestContacts:
    def test_list_contacts(self):
        cookies_resp = client.post(
            "/auth/login",
            json={"identifier": "alice", "otp": "123456"},
        )
        cookies = cookies_resp.cookies

        resp = client.get("/contacts", cookies=cookies)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
