from abc import ABC, abstractmethod


class StorageService(ABC):
    """Persists an image and returns a URL/path the API can hand back to the client."""

    @abstractmethod
    def save(self, data: bytes, filename: str) -> str:
        """Store `data` under a name derived from `filename` and return its URL."""

    @abstractmethod
    def delete(self, url: str) -> None:
        """Remove a previously saved file, identified by the URL `save` returned."""
