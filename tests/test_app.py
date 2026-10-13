import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture
def client(monkeypatch):
    test_activities = {
        "Chess Club": {
            "description": "Practice chess",
            "schedule": "Mondays",
            "max_participants": 3,
            "participants": ["existing@example.com"],
        },
        "Art Club": {
            "description": "Make art",
            "schedule": "Tuesdays",
            "max_participants": 5,
            "participants": [],
        },
    }
    monkeypatch.setattr(app_module, "activities", test_activities)
    return TestClient(app_module.app)


def test_root_redirects_to_frontend(client):
    response = client.get("/", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_activity_data(client):
    response = client.get("/activities")

    assert response.status_code == 200
    assert response.json()["Chess Club"]["participants"] == ["existing@example.com"]
    assert response.json()["Art Club"]["max_participants"] == 5


def test_signup_adds_participant(client):
    response = client.post(
        "/activities/Art%20Club/signup",
        params={"email": "student@example.com"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Signed up student@example.com for Art Club"}
    assert "student@example.com" in client.get("/activities").json()["Art Club"]["participants"]


def test_signup_rejects_unknown_activity(client):
    response = client.post(
        "/activities/Unknown%20Club/signup",
        params={"email": "student@example.com"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_signup_rejects_duplicate_without_changing_participants(client):
    original_participants = client.get("/activities").json()["Chess Club"]["participants"]

    response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": "existing@example.com"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for this activity"
    assert client.get("/activities").json()["Chess Club"]["participants"] == original_participants


def test_signup_requires_email(client):
    response = client.post("/activities/Art%20Club/signup")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "email"]


def test_remove_signup_removes_participant(client):
    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": "existing@example.com"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Removed existing@example.com from Chess Club"}
    assert "existing@example.com" not in client.get("/activities").json()["Chess Club"]["participants"]


def test_remove_signup_rejects_unknown_activity(client):
    response = client.delete(
        "/activities/Unknown%20Club/signup",
        params={"email": "student@example.com"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_remove_signup_rejects_unregistered_participant(client):
    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": "student@example.com"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"


def test_remove_signup_requires_email(client):
    response = client.delete("/activities/Chess%20Club/signup")

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", "email"]