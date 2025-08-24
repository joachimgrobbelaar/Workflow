#!/bin/bash

# Define variables
# --- IMPORTANT: REPLACE THIS WITH YOUR ACTUAL GIT REPOSITORY URL ---
# Make sure this repository contains your app.py, requirements.txt, ai_service.py, etc.
REPO_URL="https://github.com/joachimgrobbelaar/Workflow"

APP_DIR="/opt/workflow_app"             # Directory where the application will be cloned and run
VENV_DIR="$APP_DIR/venv"                # Virtual environment directory
FLASK_APP_NAME="app"                    # Name of the Flask app instance (e.g., 'app' in 'app.py')
LISTEN_PORT="80"                        # Port Gunicorn will listen on (standard HTTP)
GCP_PROJECT_ID="studied-anchor-469110-c1" # Your Google Cloud Project ID

# --- Step 1: Update OS packages and install necessary tools ---
echo "--- Updating OS packages and installing dependencies ---"
sudo apt-get update
sudo apt-get install -y git python3 python3-venv python3-pip curl nginx # Install nginx for proxy (optional but good practice)

# --- Step 2: Clone your application code ---
echo "--- Cloning application from $REPO_URL ---"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR" # Give current user ownership to manage files
if [ -d "$APP_DIR/.git" ]; then
    echo "Repository already exists. Pulling latest changes."
    cd "$APP_DIR"
    git pull origin main # Assuming 'main' is your default branch
else
    echo "Cloning new repository."
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# Ensure we are in the application directory for subsequent steps
cd "$APP_DIR"

# --- Step 3: Create and activate a Python virtual environment ---
echo "--- Setting up Python virtual environment ---"
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi
source "$VENV_DIR/bin/activate"

# --- Step 4: Install Python dependencies ---
echo "--- Installing Python dependencies from requirements.txt ---"
pip install --upgrade pip
pip install -r requirements.txt

# --- Step 5: Create a systemd service for Gunicorn ---
echo "--- Creating Gunicorn systemd service ---"

# Create a Gunicorn configuration file (best practice)
cat <<EOL > "$APP_DIR/gunicorn_config.py"
bind = "0.0.0.0:$LISTEN_PORT"
workers = 4 # Adjust based on your VM's CPU cores and expected load (e.g., 2*CPU_CORES + 1)
threads = 2 # Adjust based on your app's I/O
timeout = 120 # Timeout for requests (in seconds)
loglevel = "info"
accesslog = "-" # Output access logs to stdout (Cloud Logging will pick this up)
errorlog = "-"  # Output error logs to stderr (Cloud Logging will pick this up)
EOL

# Create the systemd service file
# This will ensure Gunicorn starts on boot and restarts if it crashes
sudo bash -c "cat <<EOF > /etc/systemd/system/workflow_app.service
[Unit]
Description=Gunicorn instance to serve the Workflow App
After=network.target

[Service]
User=$USER # Runs Gunicorn under the user who executed the script
Group=www-data # Or another appropriate group
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin"
Environment="GOOGLE_CLOUD_PROJECT=$GCP_PROJECT_ID" # Set project ID for Secret Manager
ExecStart=$VENV_DIR/bin/gunicorn --config gunicorn_config.py $FLASK_APP_NAME:$FLASK_APP_NAME
Restart=always
Type=simple
PIDFile=/run/workflow_app.pid # Optional: for type=forking if needed

[Install]
WantedBy=multi-user.target
EOF"

# --- Step 6: Start and enable the Gunicorn service ---
echo "--- Starting and enabling Gunicorn service ---"
sudo systemctl daemon-reload # Reload systemd to recognize the new service file
sudo systemctl start workflow_app    # Start the service immediately
sudo systemctl enable workflow_app   # Enable the service to start on boot

# --- Optional: Configure Nginx as a Reverse Proxy (highly recommended for production) ---
# Nginx provides load balancing, SSL termination, static file serving, etc.
echo "--- Setting up Nginx as a reverse proxy (Optional but Recommended) ---"
sudo systemctl start nginx
sudo systemctl enable nginx

sudo bash -c "cat <<EOF > /etc/nginx/sites-available/workflow_app
server {
    listen 80;
    server_name _; # Listen on all available hostnames/IPs

    location /static {
        alias $APP_DIR/static; # Serve static files directly from Nginx
    }

    location / {
        proxy_pass http://127.0.0.1:$LISTEN_PORT; # Forward requests to Gunicorn
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF"

# Enable the Nginx site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/workflow_app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default # Remove default Nginx site if it exists
sudo systemctl restart nginx
echo "Nginx configured and restarted."


echo "--- Deployment script finished ---"
echo "Check Gunicorn service status: 'sudo systemctl status workflow_app'"
echo "Check Nginx service status: 'sudo systemctl status nginx'"
echo "Application should be accessible at the VM's external IP (e.g., http://$EXTERNAL_IP)."

# --- Firewall Reminder ---
echo "--- IMPORTANT: Ensure firewall rules allow HTTP (port 80) traffic to this VM. ---"
echo "You can do this with: 'gcloud compute firewall-rules create default-allow-http --allow tcp:80 --target-tags http-server --project=$GCP_PROJECT_ID'"