class FeedbackManager:
    """Update the visual cue immediately; rate limit spoken cues across all messages."""

    def __init__(self, cooldown_seconds=2.5):
        self.cooldown_seconds = cooldown_seconds
        self.last_spoken = float("-inf")
        self.last_visual = None
        self.last_visual_at = float("-inf")

    def update(self, cue, default, now):
        if cue:
            self.last_visual, self.last_visual_at = cue, now
            if now - self.last_spoken >= self.cooldown_seconds:
                self.last_spoken = now
                return cue, cue
        return (self.last_visual if now - self.last_visual_at < 1.5 else default), None
