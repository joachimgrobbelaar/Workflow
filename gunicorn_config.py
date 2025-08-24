# gunicorn_config.py
import os

bind = "0.0.0.0:80" # Listen on port 80 for HTTP traffic (Nginx will proxy to this)
workers = (os.cpu_count() * 2) + 1 if os.cpu_count() else 3 # A common heuristic
threads = 2 # Usually 2-4 threads per worker is a good start
timeout = 120 # Timeout for requests (in seconds). Adjust if workflows are very long.
loglevel = "info"
accesslog = "-" # Output access logs to stdout for Cloud Logging
errorlog = "-"  # Output error logs to stderr for Cloud Logging