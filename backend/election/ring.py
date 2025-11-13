def next_leader(nodes, current):
    idx = (nodes.index(current) + 1) % len(nodes)
    return nodes[idx]

