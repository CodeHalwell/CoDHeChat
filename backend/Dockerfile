FROM python:3.13-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN pip install uv && uv sync

COPY . .

# Run migrations (if any exist) then start the server
# Using || true to continue even if migrations fail (no migrations yet)
CMD ["sh", "-c", "python run_migrations.py || true && uv run uvicorn main:app --host 0.0.0.0 --port 8000"]
