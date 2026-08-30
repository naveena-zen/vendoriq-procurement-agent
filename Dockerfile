# =====================================================================
# STAGE 1: Build React Frontend
# =====================================================================
FROM node:20-slim AS frontend-builder

WORKDIR /build

# Copy dependency manifests first for layer caching
COPY frontend/package.json frontend/package-lock.json ./

# Install npm dependencies
RUN npm ci

# Copy frontend source files and build production static bundle
COPY frontend/ ./
RUN npm run build

# =====================================================================
# STAGE 2: Python FastAPI Production Runtime
# =====================================================================
FROM python:3.11-slim AS runner

# Set environment defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Create non-root system user for security
RUN useradd -m -u 1000 procureiq

# Copy backend requirements first for pip layer caching
COPY backend/requirements.txt /app/backend/requirements.txt

# Install Python backend dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source code
COPY backend/ /app/backend/

# Copy built frontend static assets from Stage 1 into backend static directory
COPY --from=frontend-builder /build/dist /app/backend/static

# Ensure non-root user owns the app directory (including database file location)
RUN chown -R procureiq:procureiq /app

# Switch to non-root user
USER procureiq

WORKDIR /app/backend

# Expose port (default 8000)
EXPOSE 8000

# Start FastAPI using uvicorn binding dynamically to runtime $PORT environment variable
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
