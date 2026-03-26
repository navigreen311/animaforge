import pytest
from httpx import AsyncClient, ASGITransport
from src.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")
