from dataclasses import dataclass


@dataclass
class LogEntry:
    level: str
    message: str
