# Use a slim Python base image for smaller image size
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies. Use --no-cache-dir to prevent caching pip downloads,
# which further reduces image size.
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code into the container
# This copies app.py, workflow_manager.py, templates/, static/, etc.
COPY . .

# Expose the port that your application will listen on.
# Cloud Run expects the application to listen on the port specified by the PORT environment variable.
# Gunicorn will be configured to listen on this port.
ENV PORT 8080
EXPOSE 8080

# Command to run your application using Gunicorn.
# `gunicorn --bind :$PORT` tells Gunicorn to listen on all interfaces on the port specified by the $PORT env var.
# `--workers 1 --threads 8` is a common configuration for Cloud Run (adjust as needed for concurrency).
# `app:app` refers to the 'app' Flask application instance found in the 'app.py' file.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 app:app
