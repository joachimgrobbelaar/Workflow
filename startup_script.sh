#!/bin/bash

# Define variables
# --- IMPORTANT: REPLACE THIS WITH YOUR ACTUAL GIT REPOSITORY URL ---
# This script assumes your entire application is in this GitHub repo.
# Make sure your GitHub repo is PUBLIC for the VM to clone it without authentication.
REPO_URL="https://github.com/joachimgrobbelaar/Workflow.git" # <<<--- CONFIRM THIS IS PUBLIC!

APP_DIR="/opt/workflow_app"             # Directory where the application will be cloned and run
VENV_DIR="$APP_DIR/venv"                # Virtual environment directory
FLASK_APP_NAME="app"                    # Name of the Flask app instance (e.g., 'app' in 'app.py')
LISTEN_PORT="8000"                      # Internal port Gunicorn will listen on. Nginx will proxy to this.
GCP_PROJECT_ID="studied-anchor-469110-c1" # Your Google Cloud Project ID

# Log all output to a file for debugging
exec > >(tee /var/log/startup-script.log|logger -t startup-script -s 2>/dev/console) 2>&1
echo "--- Starting startup script at $(date) ---"

# --- Step 1: Update OS packages and install necessary tools ---
echo "--- Updating OS packages and installing dependencies ---"
sudo apt-get update -y
sudo apt-get install -y git python3 python3-venv python3-pip curl nginx

# Check if apt-get install was successful
if [ $? -ne 0 ]; then
    echo "ERROR: apt-get install failed. Exiting startup script."
    exit 1
fi

# --- Step 2: Clone your application code ---
echo "--- Cloning application from $REPO_URL ---"
# Ensure the directory is clean or create it
if [ -d "$APP_DIR" ]; then
    echo "Application directory exists, clearing for fresh clone."
    sudo rm -rf "$APP_DIR" # Remove existing app directory to avoid conflicts
fi
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR" # Give current user ownership to manage files

git clone "$REPO_URL" "$APP_DIR"
if [ $? -ne 0 ]; then
    echo "ERROR: Git clone failed. Is the repository public and URL correct? Exiting startup script."
    exit 1
fi

# Ensure we are in the application directory for subsequent steps
cd "$APP_DIR" || { echo "ERROR: Failed to change to application directory '$APP_DIR'. Exiting."; exit 1; }

# --- Step 3: Create and activate a Python virtual environment ---
echo "--- Setting up Python virtual environment at $VENV_DIR ---"
if [ -d "$VENV_DIR" ]; then
    echo "Virtual environment already exists, removing for fresh creation."
    rm -rf "$VENV_DIR"
fi
python3 -m venv "$VENV_DIR"
if [ $? -ne 0 ]; then
    echo "ERROR: Virtual environment creation failed. Exiting startup script."
    exit 1
fi
source "$VENV_DIR/bin/activate"
echo "Virtual environment activated."

# --- Step 4: Install Python dependencies ---
echo "--- Installing Python dependencies from requirements.txt ---"
# Ensure pip is upgraded within the venv
pip install --upgrade pip
if [ $? -ne 0 ]; then
    echo "WARNING: Upgrading pip failed, proceeding anyway."
fi

pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: pip install failed. Check requirements.txt and package availability. Exiting startup script."
    exit 1
fi
echo "Python dependencies installed."

# --- Step 5: Create a systemd service for Gunicorn ---
echo "--- Creating Gunicorn systemd service ---"

# Create a Gunicorn configuration file (best practice)
cat <<EOL > "$APP_DIR/gunicorn_config.py"
bind = "0.0.0.0:$LISTEN_PORT"
workers = \$((\$(nproc) * 2 + 1)) # Use nproc for dynamic worker count
threads = 2
timeout = 120
loglevel = "info"
accesslog = "-"
errorlog = "-"
EOL

# Create the systemd service file
sudo bash -c "cat << 'EOF_SERVICE' > /etc/systemd/system/workflow_app.service
[Unit]
Description=Gunicorn instance to serve the Workflow App
After=network.target

[Service]
User=$USER
Group=www-data
WorkingDirectory=$APP_DIR
Environment=\"PATH=$VENV_DIR/bin\"
Environment=\"GOOGLE_CLOUD_PROJECT=$GCP_PROJECT_ID\"
ExecStart=$VENV_DIR/bin/gunicorn --config $APP_DIR/gunicorn_config.py $FLASK_APP_NAME:$FLASK_APP_NAME
Restart=always
Type=simple

[Install]
WantedBy=multi-user.target
EOF_SERVICE"

# --- Step 6: Start and enable the Gunicorn service ---
echo "--- Starting and enabling Gunicorn service ---"
sudo systemctl daemon-reload
sudo systemctl start workflow_app
sudo systemctl enable workflow_app
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start/enable Gunicorn service. Check 'sudo journalctl -u workflow_app'. Exiting startup script."
    exit 1
fi
echo "Gunicorn service setup complete."


# --- Step 7: Configure Nginx as a Reverse Proxy (highly recommended for production) ---
echo "--- Setting up Nginx as a reverse proxy ---"

# Ensure Nginx is installed and its directories exist
if ! systemctl is-active --quiet nginx; then
    echo "WARNING: Nginx service is not active. Attempting to start/enable it."
    sudo systemctl start nginx
    sudo systemctl enable nginx
fi

# Create the Nginx site configuration
# The 'EOF_NGINX' marker MUST be at the very beginning of its line, no leading spaces!
sudo bash -c "cat << 'EOF_NGINX' > /etc/nginx/sites-available/workflow_app
server {
    listen 80;
    server_name _;

    location /static {
        alias $APP_DIR/static;
        expires 30d;
        add_header Cache-Control \"public, no-transform\";
    }

    location / {
        proxy_pass http://127.0.0.1:$LISTEN_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
EOF_NGINX"

# Enable the Nginx site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/workflow_app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default # Remove default Nginx site if it exists
sudo systemctl restart nginx
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to restart Nginx service. Check 'sudo systemctl status nginx' and 'sudo tail /var/log/nginx/error.log'. Exiting startup script."
    exit 1
fi
echo "Nginx configured and restarted."


echo "--- Deployment script finished at $(date) ---"
echo "Check Gunicorn service status: 'sudo systemctl status workflow_app'"
echo "Check Nginx service status: 'sudo systemctl status nginx'"
echo "Application should be accessible at the VM's external IP."
echo "--- IMPORTANT: Ensure firewall rules allow HTTP (port 80) traffic to this VM. ---"
echo "You can do this with: 'gcloud compute firewall-rules create default-allow-http --allow tcp:80 --target-tags http-server --project=$GCP_PROJECT_ID'"