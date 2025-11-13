def apply_update(replica_state, update):
    # Causally related updates ordered; unrelated can commute (simulated)
    replica_state.append(("causal", update))
    return replica_state

