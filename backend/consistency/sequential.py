def apply_update(replica_state, update):
    # Maintain a single global order (simulated)
    replica_state.append(("sequential", update))
    return replica_state

