import time
from dataclasses import dataclass, field


@dataclass
class SessionRecord:
    session_id: str
    messages: list = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)
