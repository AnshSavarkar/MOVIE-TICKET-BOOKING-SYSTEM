def adjust_times(offsets):
    # Returns average offset
    if not offsets:
        return 0.0
    return sum(offsets) / len(offsets)

