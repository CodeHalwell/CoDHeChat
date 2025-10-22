import os
from typing import AsyncGenerator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables from .env file (including OPENAI_API_KEY)
load_dotenv()

# Initialize AsyncOpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

# Add CORS middleware to allow requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optionally serve a simple home page (could be your React build in production)
@app.get("/")
def read_root():
    return HTMLResponse("<h3>Chatbot server is running</h3>")

# Define an async generator function to stream responses from OpenAI
async def stream_openai_response(user_message: str) -> AsyncGenerator[str, None]:
    """
    Call OpenAI API with the user's message and stream back the response text.
    Yields partial response chunks as they arrive.
    """
    # OpenAI ChatCompletion call with streaming enabled
    stream = await client.chat.completions.create(
        model="gpt-3.5-turbo",  # Using gpt-3.5-turbo as gpt-5-mini doesn't exist
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": user_message}
        ],
        stream=True  # get incremental results as the AI generates the answer
    )
    
    full_reply = ""
    async for chunk in stream:  # iterate over streamed chunks
        if chunk.choices[0].delta.content:
            full_reply += chunk.choices[0].delta.content  # accumulate the response text
            yield full_reply  # yield the current state of the full reply

# WebSocket endpoint for real-time chat
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Accept the WebSocket connection
    await websocket.accept()
    client_addr = websocket.client.host
    print(f"Client connected: {client_addr}")

    try:
        while True:
            # Wait for a message from the client (user's query)
            user_message = await websocket.receive_text()
            # For each chunk of AI response, send it over the WebSocket
            async for partial_reply in stream_openai_response(user_message):
                await websocket.send_text(partial_reply)
            # Optionally, send a special message or flag when done (not strictly needed)
    except WebSocketDisconnect:
        # Handle client disconnects gracefully
        print(f"Client disconnected: {client_addr}")
        # (Loop will exit, and function ends)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)