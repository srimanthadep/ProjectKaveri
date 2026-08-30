"""
Tests for the floating Gemini assistant endpoint (POST /ai/chat).
"""
from unittest.mock import AsyncMock, patch
import pytest
from app.services.gemini_client import GeminiError


def test_chat_without_gemini_key_returns_503(client, guest_headers, monkeypatch):
    monkeypatch.setattr("app.services.gemini_client.GEMINI_API_KEY", "")
    res = client.post("/ai/chat", json={"message": "When is my next stay?"}, headers=guest_headers)
    assert res.status_code == 503
    assert "unavailable" in res.json()["error"]["message"].lower()


def test_chat_works_anonymously_without_auth(client):
    with patch("app.routers.ai.call_gemini", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "We have three properties: Riverside, Hilltop, and Backwater."
        res = client.post("/ai/chat", json={"message": "What properties do you have?"})
        assert res.status_code == 200
        assert res.json()["data"] == "We have three properties: Riverside, Hilltop, and Backwater."


def test_chat_rejects_empty_message(client, guest_headers):
    res = client.post("/ai/chat", json={"message": ""}, headers=guest_headers)
    assert res.status_code == 422


def test_chat_rejects_unknown_fields(client, guest_headers):
    # StrictBaseModel: extra="forbid" — structurally blocks unexpected fields.
    res = client.post(
        "/ai/chat",
        json={"message": "hi", "role_override": "owner"},
        headers=guest_headers,
    )
    assert res.status_code == 422


def test_chat_accepts_history_and_current_view(client, staff_headers):
    with patch("app.routers.ai.call_gemini", new_callable=AsyncMock) as mock_call:
        mock_call.return_value = "Your property in Coorg has 3 rooms."
        res = client.post(
            "/ai/chat",
            json={
                "message": "How many rooms does my property have?",
                "history": [{"role": "user", "content": "hi"}, {"role": "model", "content": "hello!"}],
                "current_view": "staff-dashboard",
            },
            headers=staff_headers,
        )
        assert res.status_code == 200
        assert res.json()["data"] == "Your property in Coorg has 3 rooms."
