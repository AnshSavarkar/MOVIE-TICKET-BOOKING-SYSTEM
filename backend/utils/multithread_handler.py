import asyncio
from contextlib import asynccontextmanager
from typing import Dict, List, Tuple


class SeatLockManager:
    def __init__(self):
        self._locks: Dict[Tuple[int, str], asyncio.Lock] = {}

    def _get_lock(self, show_id: int, seat: str) -> asyncio.Lock:
        key = (show_id, seat)
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

    @asynccontextmanager
    async def async_lock(self, show_id: int, seats: List[str]):
        locks = [self._get_lock(show_id, s) for s in seats]
        # total order to avoid deadlocks
        ordered = sorted(zip(seats, locks), key=lambda x: x[0])
        try:
            for _, l in ordered:
                await l.acquire()
            yield
        finally:
            for _, l in reversed(ordered):
                try:
                    l.release()
                except RuntimeError:
                    pass

