# ... (previous parts of startup_script.sh)

# --- Step 7: Configure Nginx as a Reverse Proxy (highly recommended for production) ---
# Nginx provides load balancing, SSL termination, static file serving, etc.
echo "--- Setting up Nginx as a reverse proxy ---"
sudo systemctl start nginx
sudo systemctl enable nginx

# Create the Nginx site configuration
# The 'EOF' marker MUST be at the very beginning of the line below, no leading spaces!
sudo bash -c "cat << 'EOF' > /etc/nginx/sites-available/workflow_app
server {
    listen 80; # Nginx listens on standard HTTP port
    server_name _; # Listen on all available hostnames/IPs

    # Serve static files directly from Nginx for performance
    location /static {
        alias $APP_DIR/static;
        expires 30d; # Cache static files for 30 days
        add_header Cache-Control \"public, no-transform\";
    }

    # Forward all other requests to Gunicorn
    location / {
        proxy_pass http://127.0.0.1:$LISTEN_PORT; # Proxy to Gunicorn's internal port
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 600; # Longer timeouts for potentially long-running workflows
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }
}
EOF" # <<< --- THIS 'EOF' MUST BE AT THE VERY BEGINNING OF THE LINE, NO INDENTATION

# Enable the Nginx site and restart Nginx
sudo ln -sf /etc/nginx/sites-available/workflow_app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default # Remove default Nginx site if it exists
sudo systemctl restart nginx
echo "Nginx configured and restarted."

# ... (rest of startup_script.sh)