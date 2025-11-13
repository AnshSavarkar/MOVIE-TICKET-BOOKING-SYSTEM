def elect(nodes):
    # Highest port wins
    return sorted(nodes, key=lambda n: int(n.split(":")[1]))[-1]

