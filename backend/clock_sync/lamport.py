class LamportClock:
    def __init__(self):
        self.c = 0

    def tick(self):
        self.c += 1
        return self.c

    def receive(self, other: int):
        self.c = max(self.c, other) + 1
        return self.c

