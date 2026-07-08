FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV UPLOAD_DIR=/data/uploads

EXPOSE 8000

# Run migrations and first-start seeding, then start the API
CMD ["sh", "-c", "alembic upgrade head && python -m app.cli && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
