def to_bool(value: str) -> bool:
    return str(value).lower() in {"1", "true", "yes", "on"}
