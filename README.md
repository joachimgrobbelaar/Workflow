
# Flowchart AI Pipeline Application - GCE Deployment

This project is a visual programming tool to design and develop complex AI programs using a flowchart interface. This document provides instructions for deploying the application to a **Google Compute Engine (GCE) VM**.

## Architecture Overview

The application follows a secure client-server model designed for a GCE environment:

-   **Frontend**: A Single-Page Application (SPA) built with React. It provides the UI for building workflows, with persistence in the browser's `localStorage`.
-   **Backend**: A Python Flask server running on a GCE VM.
    -   It is served by **Gunicorn**, a production-ready WSGI server.
    -   **Nginx** is used as a high-performance reverse proxy, handling incoming traffic on port 80 and forwarding it to Gunicorn.
    -   It serves the static frontend assets and provides a secure API endpoint (`/api/ai-request`) for all AI-related tasks.
-   **Security**: API keys are stored in **Google Cloud Secret Manager**. The GCE VM is assigned a dedicated Service Account with permission to access these secrets. Keys are loaded into the application's memory at startup and are **never exposed to the client's browser**.

## Prerequisites

-   [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed and authenticated.
-   A Git repository containing your application code.
-   A Google Cloud Project with Billing enabled.

## 1. Google Cloud Setup (One-Time)

Before deploying, you must set up the necessary GCP services.

### a. Enable APIs

Enable the required APIs for your project.

```sh
gcloud services enable compute.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### b. Create Secrets in Secret Manager

Store your API keys securely. Replace `YOUR_..._KEY_VALUE` with your actual keys.

```sh
# Your GCP Project ID
export PROJECT_ID="studied-anchor-469110-c1"

# Create secrets (if they don't exist)
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create OPENAI_API_KEY --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create DEEPSEEK_API_KEY --replication-policy="automatic" --project=$PROJECT_ID

# Add the secret values (versions)
gcloud secrets versions add GEMINI_API_KEY --data-file=- <<< "YOUR_GEMINI_KEY_VALUE" --project=$PROJECT_ID
gcloud secrets versions add OPENAI_API_KEY --data-file=- <<< "YOUR_OPENAI_KEY_VALUE" --project=$PROJECT_ID
gcloud secrets versions add DEEPSEEK_API_KEY --data-file=- <<< "YOUR_DEEPSEEK_KEY_VALUE" --project=$PROJECT_ID
```

### c. Create Service Account

Create the dedicated service account that the GCE VM will use.

```sh
gcloud iam service-accounts create backend \
    --display-name="Service Account for Backend VM" \
    --project=$PROJECT_ID
```

### d. Grant Permissions

Grant the service account permission to access the secrets.

```sh
# Your Service Account Email
export SA_EMAIL="backend@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant role for each secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.secretAccessor" --project=$PROJECT_ID
gcloud secrets add-iam-policy-binding OPENAI_API_KEY --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.secretAccessor" --project=$PROJECT_ID
gcloud secrets add-iam-policy-binding DEEPSEEK_API_KEY --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.secretAccessor" --project=$PROJECT_ID
```

## 2. Local Development

To test the application on your local machine:

1.  **Set up Python Environment**:
    ```sh
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
2.  **Authenticate for Secret Manager Access**: This allows your local app to use your personal GCP credentials to fetch secrets.
    ```sh
    gcloud auth application-default login
    ```
3.  **Run the Flask Server**:
    ```sh
    python app.py
    ```
    The application will be available at `http://localhost:8080`.

## 3. Deployment to Google Compute Engine

We will create a GCE VM that automatically configures and runs the application using a startup script.

### a. Create a Firewall Rule

Create a firewall rule to allow HTTP traffic to your VM instances.

```sh
gcloud compute firewall-rules create allow-http \
    --project=$PROJECT_ID \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:80 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server
```

### b. Create and Configure the GCE VM

Run the following command to create the VM. It attaches the service account, network tag (for the firewall rule), and the startup script.

**Important:** Make sure the `startup_script.sh` file is in your current directory before running this command.

```sh
gcloud compute instances create backend \
    --project=$PROJECT_ID \
    --zone=africa-south1-a \
    --machine-type=e2-medium \
    --service-account=$SA_EMAIL \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --tags=http-server \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=20GB \
    --metadata-from-file startup-script=./startup_script.sh
```

### c. Monitor the Deployment

The startup script will run in the background. You can monitor its progress by viewing the serial port output.

```sh
gcloud compute instances get-serial-port-output backend --zone=africa-south1-a
```
Wait for the script to finish (it may take a few minutes). Look for the message "Startup script finished successfully."

### d. Access the Application

Once the script is finished, find your VM's external IP address:

```sh
gcloud compute instances describe backend --zone=africa-south1-a --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```
Open your browser and navigate to `http://<YOUR_VM_EXTERNAL_IP>`.

## Troubleshooting

-   **App Not Loading (Timeout)**:
    -   Check if the firewall rule `allow-http` was created and applied correctly (check for the `http-server` tag on the VM).
    -   Check the serial port logs for errors during the startup script execution. An error might have stopped Nginx or Gunicorn from starting.
    -   SSH into the VM (`gcloud compute ssh backend`) and check the status of the services: `sudo systemctl status workflowapp` and `sudo systemctl status nginx`.
-   **502 Bad Gateway Error**: This usually means Nginx is running but cannot connect to Gunicorn. SSH into the VM and check the Gunicorn service status (`sudo systemctl status workflowapp`). Check the Gunicorn logs for errors: `sudo journalctl -u workflowapp`.
-   **API Key Errors**: If the app loads but AI calls fail, it's likely a permissions issue. Ensure the GCE VM's service account (`backend@...`) has the `Secret Manager Secret Accessor` role for **all three** secrets.
