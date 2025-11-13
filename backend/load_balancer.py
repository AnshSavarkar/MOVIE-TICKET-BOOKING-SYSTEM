import argparse
import asyncio
import json
import random
import time
from typing import List, Dict, Optional

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn


class LoadBalancer:
    def __init__(self, nodes: List[str], strategy: str = "round_robin"):
        self.nodes = nodes
        self.strategy = strategy
        self.rr_idx = 0
        self.conn_counts: Dict[str, int] = {n: 0 for n in nodes}
        self.avg_rt_ms: Dict[str, float] = {n: 100.0 for n in nodes}
        self.metrics = {
            "requests_served": {n: 0 for n in nodes},
            "avg_response_ms": self.avg_rt_ms,
            "conn_counts": self.conn_counts,
        }

    def pick_node(self) -> str:
        alive = self.nodes
        if self.strategy == "random":
            return random.choice(alive)
        if self.strategy == "least_connections":
            return min(alive, key=lambda n: self.conn_counts.get(n, 0))
        if self.strategy == "weighted_response_time":
            return min(alive, key=lambda n: self.avg_rt_ms.get(n, 100.0))
        # default round robin
        node = alive[self.rr_idx % len(alive)]
        self.rr_idx += 1
        return node

    async def proxy(self, method: str, path: str, body: Optional[bytes], headers: Dict[str, str]):
        attempts = 0
        last_exc = None
        while attempts < len(self.nodes):
            node = self.pick_node()
            url = f"http://{node}{path}"
            start = time.time()
            self.conn_counts[node] = self.conn_counts.get(node, 0) + 1
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.request(method, url, content=body, headers=headers)
                    elapsed_ms = (time.time() - start) * 1000
                    # EMA for response time
                    self.avg_rt_ms[node] = 0.8 * self.avg_rt_ms.get(node, 100.0) + 0.2 * elapsed_ms
                    self.metrics["requests_served"][node] = self.metrics["requests_served"].get(node, 0) + 1
                    return resp.status_code, dict(resp.headers), resp.content
            except Exception as e:
                last_exc = e
                attempts += 1
            finally:
                self.conn_counts[node] = max(0, self.conn_counts.get(node, 0) - 1)
        # all attempts failed
        return 502, {"content-type": "application/json"}, b'{"detail":"No backend nodes available"}'


app = FastAPI(title="Load Balancer")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

lb: Optional[LoadBalancer] = None


@app.get("/lb/metrics")
async def lb_metrics():
    return lb.metrics if lb else {}


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_all(request: Request, full_path: str):
    assert lb is not None
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() != 'host'}
    status, resp_headers, content = await lb.proxy(request.method, f"/{full_path}", body, headers)
    return Response(content=content, status_code=status, headers=resp_headers)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--nodes", required=True, help="comma separated host:port list")
    parser.add_argument("--strategy", default="round_robin", choices=["round_robin", "random", "least_connections", "weighted_response_time"])
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    nodes = args.nodes.split(",")
    global lb
    lb = LoadBalancer(nodes, strategy=args.strategy)
    uvicorn.run(app, host="127.0.0.1", port=args.port, reload=False)


if __name__ == "__main__":
    main()

