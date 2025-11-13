def apply_update(replica_state, update):
    # Apply immediately everywhere
    replica_state.append(("strict", update))
    return replica_state

