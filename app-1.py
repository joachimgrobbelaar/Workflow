import os
from google.cloud import secretmanager
from flask import Flask, render_template, request, jsonify, redirect, url_for
import json
import time

# Import your AI service
from ai_service import generate_text # Assuming you have ai_service.py from previous prompt

# --- Initialize Flask app ---
app = Flask(__name__)

# --- Load API Keys from Secret Manager ---
def load_api_keys():
    client = secretmanager.SecretManagerServiceClient()
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        # Fallback for local testing if GOOGLE_CLOUD_PROJECT is not set
        # This will work if you've run 'gcloud auth application-default login' locally
        # or have GOOGLE_APPLICATION_CREDENTIALS pointing to a key file.
        # For production, GOOGLE_CLOUD_PROJECT should always be set.
        print("WARNING: GOOGLE_CLOUD_PROJECT environment variable not set. Attempting to get project ID from default credentials.")
        try:
            # This attempts to infer the project ID from the default credentials
            from google.auth import default
            _, project_id = default()
        except Exception as e:
            print(f"Error inferring project ID: {e}")
            print("CRITICAL: Could not determine GCP Project ID. AI services will be unavailable.")
            return

    if not project_id:
        print("CRITICAL: GCP Project ID is still unknown. AI services will be unavailable.")
        return

    try:
        openai_secret_name = f"projects/{project_id}/secrets/OPENAI_API_KEY/versions/latest"
        deepseek_secret_name = f"projects/{project_id}/secrets/DEEPSEEK_API_KEY/versions/latest"

        app.config['OPENAI_KEY'] = client.access_secret_version(request={"name": openai_secret_name}).payload.data.decode("UTF-8")
        app.config['DEEPSEEK_KEY'] = client.access_secret_version(request={"name": deepseek_secret_name}).payload.data.decode("UTF-8")
        print("API keys loaded successfully from Secret Manager.")
    except Exception as e:
        print(f"ERROR: Failed to load API keys from Secret Manager: {e}")
        # In a real app, you might want to raise an exception or handle more gracefully
        app.config['OPENAI_KEY'] = None
        app.config['DEEPSEEK_KEY'] = None

# Call this function to load keys when the app starts
with app.app_context():
    load_api_keys()

# --- Your Home Page Route ---
@app.route('/')
def home():
    # This example assumes workflow_manager.py has a list_workflows() function
    # In a real setup, you might fetch these dynamically via JS or pass them.
    # For now, let's just render the template.
    return render_template('index.html')

# --- Existing /api/workflows endpoint (from previous prompt) ---
@app.route('/api/workflows', methods=['GET'])
def get_workflows():
    # Placeholder: Implement actual workflow listing from workflow_manager.py
    # For demonstration, returning dummy data
    workflows = [
        {"id": "sample_pipeline", "name": "Sample Data Processing", "description": "A basic workflow."},
        {"id": "analytics_report", "name": "Daily Analytics Report", "description": "Generates a report from logs."}
    ]
    return jsonify(workflows)

# --- Existing /api/run_workflow endpoint (from previous prompt) ---
@app.route('/api/run_workflow/<workflow_id>', methods=['POST'])
def run_workflow_api(workflow_id):
    # Placeholder: Call your actual workflow execution logic
    print(f"Simulating run of workflow: {workflow_id}")
    time.sleep(2) # Simulate work
    return jsonify({"status": "success", "message": f"Workflow '{workflow_id}' started."})

# --- New AI content generation endpoint ---
@app.route('/api/generate_ai_content', methods=['POST'])
def generate_ai_content():
    data = request.json
    prompt = data.get("prompt")
    model_choice = data.get("model", "openai") # Default to openai if not specified

    if not prompt:
        return jsonify({"status": "error", "message": "No prompt provided."}), 400

    openai_key = app.config.get('OPENAI_KEY')
    deepseek_key = app.config.get('DEEPSEEK_KEY')

    if model_choice == "openai" and not openai_key:
        return jsonify({"status": "error", "message": "OpenAI API key not available."}), 500
    if model_choice == "deepseek" and not deepseek_key:
        return jsonify({"status": "error", "message": "DeepSeek API key not available."}), 500

    try:
        generated_text = generate_text(model_choice, prompt, openai_key, deepseek_key)
        return jsonify({"status": "success", "generated_text": generated_text})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- Editor Routes (placeholders for your existing editor) ---
@app.route('/edit/<workflow_id>')
def edit_workflow(workflow_id):
    # Load workflow data, pass to editor template
    return f"<h1>Editor for Workflow: {workflow_id}</h1><p>This is where your editor UI would be.</p>"

@app.route('/edit/new')
def new_workflow():
    return "<h1>New Workflow Editor</h1><p>Start creating a new workflow here.</p>"


# IMPORTANT: This block should only be used for local development.
# In production, Gunicorn (or App Engine) will manage the server process.
if __name__ == '__main__':
    if not os.path.exists('workflows'):
        os.makedirs('workflows')
        # Create a dummy workflow
        dummy_workflow_path = os.path.join('workflows', 'sample_pipeline.json')
        if not os.path.exists(dummy_workflow_path):
            with open(dummy_workflow_path, 'w') as f:
                json.dump({
                    "id": "sample_pipeline",
                    "name": "Sample Data Processing",
                    "description": "A basic workflow for demonstrating run and edit.",
                    "steps": []
                }, f, indent=4)
    
    # When running locally, you might want to load from .env for convenience,
    # but for this specific prompt, we assume direct Secret Manager access even locally
    # if you've run 'gcloud auth application-default login'.

    print("Starting Flask development server...")
    app.run(host='0.0.0.0', port=5000, debug=True)