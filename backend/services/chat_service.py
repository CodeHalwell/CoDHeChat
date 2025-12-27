from __future__ import annotations

from typing import AsyncIterator, Protocol

from openai import AsyncOpenAI

from settings import Settings


class ChatClient(Protocol):
    """
    Protocol defining the interface for chat completion clients.
    
    Implementations should connect to a language model or chat service and stream
    the generated response in chunks, yielding each chunk as it becomes available.
    """
    
    async def stream_chat_completion(
        self, messages: list[dict[str, str]]
    ) -> AsyncIterator[str]:
        """
        Asynchronously stream completion chunks for the provided conversation history.

        Args:
            messages (list[dict[str, str]]): A list of message dictionaries representing the conversation history.
                Each message must be a dictionary with string keys "role" and "content", where both values are strings.
                Example: [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi!"}]

        Yields:
            str: The next chunk of the generated completion as a string.

        Returns:
            AsyncIterator[str]: An asynchronous iterator yielding completion chunks as strings.
        """


class OpenAIChatClient:
    """Concrete chat client backed by OpenAI's Chat Completions API."""

    def __init__(self, api_key: str, model: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def stream_chat_completion(
        self, messages: list[dict[str, str]]
    ) -> AsyncIterator[str]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


class ChatService:
    def __init__(self, client: ChatClient, system_prompt: str | None = None) -> None:
        self._client = client
        self._system_prompt = system_prompt or "You are a helpful assistant."

    async def stream_reply(
        self, history: list[dict[str, str]]
    ) -> AsyncIterator[str]:
        messages: list[dict[str, str]]
        if history and history[0].get("role") == "system":
            messages = history
        else:
            messages = [{"role": "system", "content": self._system_prompt}, *history]

        async for chunk in self._client.stream_chat_completion(messages):
            yield chunk

    async def generate_reply(self, history: list[dict[str, str]]) -> str:
        response_parts: list[str] = []
        async for chunk in self.stream_reply(history):
            response_parts.append(chunk)
        return "".join(response_parts)


def build_chat_service(settings: Settings) -> ChatService:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    client = OpenAIChatClient(settings.openai_api_key, settings.openai_model)
    return ChatService(client)
