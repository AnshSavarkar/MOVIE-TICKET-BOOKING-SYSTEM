from typing import List, Dict
import random


class NodeRegistry:
    def __init__(self):
        self.nodes: List[str] = ["127.0.0.1:8001", "127.0.0.1:8002", "127.0.0.1:8003"]
        self.coordinator: str = self.nodes[0]
        self.lamport_clock: int = 0

    def increment_lamport(self):
        self.lamport_clock += 1
        return self.lamport_clock

    def run_election(self, algorithm: str = "bully") -> str:
        # Demo: choose highest port as leader for bully; ring next in list
        if algorithm == "bully":
            self.coordinator = sorted(self.nodes, key=lambda n: int(n.split(":")[1]))[-1]
        else:
            # ring: rotate coordinator
            idx = (self.nodes.index(self.coordinator) + 1) % len(self.nodes)
            self.coordinator = self.nodes[idx]
        return self.coordinator

    def random_node(self) -> str:
        return random.choice(self.nodes)

