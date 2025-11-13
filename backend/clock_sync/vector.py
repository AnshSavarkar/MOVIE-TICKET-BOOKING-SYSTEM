from typing import Dict


class VectorClock:
    def __init__(self):
        self.v: Dict[str, int] = {}

    def tick(self, node_id: str):
        self.v[node_id] = self.v.get(node_id, 0) + 1
        return dict(self.v)

    def merge(self, other: Dict[str, int]):
        for k, val in other.items():
            self.v[k] = max(self.v.get(k, 0), val)
        return dict(self.v)

