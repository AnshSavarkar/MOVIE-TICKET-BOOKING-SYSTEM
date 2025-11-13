def apply_update(replica_state, update):
    # Eventually applied (simulated delay external to this function)
    replica_state.append(("eventual", update))
    return replica_state

