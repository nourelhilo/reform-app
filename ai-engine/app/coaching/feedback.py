import time
from typing import Optional, List, Dict, Any

class FeedbackManager:
    """
    Manages real-time coach feedback with smart cooldowns, prioritizations,
    and prevents frame-by-frame spamming.
    """
    def __init__(self, cooldown_seconds: float = 2.5):
        self.cooldown_seconds = cooldown_seconds
        self.last_feedback_time: float = 0.0
        self.current_feedback: str = "Ready. Begin your exercise."
        self.feedback_history: List[Dict[str, Any]] = []
        self.spoken_flag: bool = False

    def update(self, issues: List[str], positive_notes: List[str], is_in_motion: bool = True) -> str:
        current_time = time.time()
        elapsed = current_time - self.last_feedback_time

        # If there are active form issues, pick highest priority issue
        if issues:
            primary_issue = issues[0]
            if elapsed >= self.cooldown_seconds or primary_issue != self.current_feedback:
                self.current_feedback = primary_issue
                self.last_feedback_time = current_time
                self.spoken_flag = True
                self.feedback_history.append({
                    "text": primary_issue,
                    "type": "issue",
                    "time": current_time
                })
        elif positive_notes and is_in_motion:
            primary_positive = positive_notes[0]
            if elapsed >= self.cooldown_seconds * 1.5 and primary_positive != self.current_feedback:
                self.current_feedback = primary_positive
                self.last_feedback_time = current_time
                self.spoken_flag = True
                self.feedback_history.append({
                    "text": primary_positive,
                    "type": "positive",
                    "time": current_time
                })

        return self.current_feedback

    def get_speech_event(self) -> Optional[str]:
        """Returns the text if a new speech event should be triggered, then resets flag."""
        if self.spoken_flag:
            self.spoken_flag = False
            return self.current_feedback
        return None
