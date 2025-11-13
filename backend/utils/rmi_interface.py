import httpx
from typing import Any, Dict, List


class RMIClient:
    """
    Experiment 1: RMI-like interface using HTTP as transport.
    Provides typed methods that map to remote endpoints.
    """

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    async def get_show_list(self, movie_id: int) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{self.base_url}/shows/{movie_id}")
            r.raise_for_status()
            return r.json()

    async def get_available_seats(self, show_id: int) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{self.base_url}/seats/{show_id}")
            r.raise_for_status()
            return r.json()

    async def book_ticket(self, user_id: int, show_id: int, seats: List[str]) -> Dict[str, Any]:
        payload = {"user_id": user_id, "show_id": show_id, "seats": seats}
        async with httpx.AsyncClient() as client:
            r = await client.post(f"{self.base_url}/book", json=payload)
            r.raise_for_status()
            return r.json()

