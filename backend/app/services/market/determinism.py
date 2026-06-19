import hashlib
from typing import List


def stable_unit_value(seed: str, salt: str) -> float:
    digest = hashlib.sha256(f"{seed}:{salt}".encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def stable_choice(options: List[str], seed: str, salt: str) -> str:
    idx = int(stable_unit_value(seed, salt) * len(options)) % len(options)
    return options[idx]
