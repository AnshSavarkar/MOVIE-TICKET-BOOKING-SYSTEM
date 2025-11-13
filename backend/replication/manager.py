import asyncio
import random
from typing import Dict, Any

from utils.network_manager import NodeRegistry


class ReplicationManager:
    def __init__(self, node_registry: NodeRegistry):
        self.node_registry = node_registry
        self.current_model = "eventual"

    async def propagate_booking(self, event: Dict[str, Any]) -> None:
        model = self.current_model
        # Simulate different propagation delays/orders
        if model == "strict":
            await self._send_to_all(event, delay_ms=0)
        elif model == "sequential":
            await self._send_in_order(event, delay_ms=10)
        elif model == "causal":
            await self._send_causal(event)
        else:
            # eventual
            asyncio.create_task(self._send_to_all(event, delay_ms=200))

    async def simulate_consistency(self, model: str):
        self.current_model = model
        import random
        import time
        
        # Simulate detailed consistency test results
        test_result = {
            "model": model,
            "status": "completed",
            "timestamp": time.time(),
            "replicas_tested": len(self.node_registry.nodes),
            "test_duration_ms": round(random.uniform(50, 200), 2),
        }
        
        if model == "eventual":
            test_result.update({
                "convergence_time_ms": round(random.uniform(100, 500), 2),
                "consistency_level": "eventual",
                "description": "All replicas will eventually be consistent"
            })
        elif model == "strong":
            test_result.update({
                "sync_latency_ms": round(random.uniform(10, 50), 2),
                "consistency_level": "strong",
                "description": "All reads reflect the most recent write"
            })
        elif model == "causal":
            test_result.update({
                "causal_dependencies": random.randint(3, 10),
                "consistency_level": "causal",
                "description": "Causally related operations are seen in order"
            })
        elif model == "sequential":
            test_result.update({
                "total_order_maintained": True,
                "consistency_level": "sequential",
                "description": "All processes see operations in the same order"
            })
        
        return test_result

    async def _send_to_all(self, event: Dict[str, Any], delay_ms: int = 0):
        await asyncio.sleep(delay_ms / 1000.0)
        # In a real system, forward to replicas. Here we just simulate.
        return True

    async def _send_in_order(self, event: Dict[str, Any], delay_ms: int = 5):
        for _ in self.node_registry.nodes:
            await asyncio.sleep(delay_ms / 1000.0)
        return True

    async def _send_causal(self, event: Dict[str, Any]):
        # causal: random but respecting causality (omitted details for brevity)
        await asyncio.sleep(0.05)
        return True

