# workflow_manager.py
import os
import json
import time

WORKFLOWS_DIR = 'workflows'

def _get_workflow_path(workflow_id: str) -> str:
    """Helper to get the full path for a workflow file."""
    return os.path.join(WORKFLOWS_DIR, f'{workflow_id}.json')

def list_workflows() -> list:
    """
    Lists all available workflows from the workflows directory.
    Returns a list of dictionaries with id, name, and description.
    """
    workflows = []
    if not os.path.exists(WORKFLOWS_DIR):
        return workflows

    for filename in os.listdir(WORKFLOWS_DIR):
        if filename.endswith('.json'):
            workflow_id = os.path.splitext(filename)[0]
            try:
                with open(_get_workflow_path(workflow_id), 'r') as f:
                    data = json.load(f)
                    workflows.append({
                        "id": data.get("id", workflow_id),
                        "name": data.get("name", workflow_id),
                        "description": data.get("description", "No description provided.")
                    })
            except Exception as e:
                print(f"Error loading workflow '{filename}': {e}")
    return workflows

def load_workflow(workflow_id: str) -> dict | None:
    """
    Loads a specific workflow by its ID.
    Returns the workflow data as a dictionary, or None if not found.
    """
    path = _get_workflow_path(workflow_id)
    if os.path.exists(path):
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading workflow '{workflow_id}': {e}")
    return None

def save_workflow(workflow_id: str, data: dict):
    """
    Saves or updates a workflow.
    """
    if not os.path.exists(WORKFLOWS_DIR):
        os.makedirs(WORKFLOWS_DIR)
    
    path = _get_workflow_path(workflow_id)
    try:
        with open(path, 'w') as f:
            json.dump(data, f, indent=4)
        print(f"Workflow '{workflow_id}' saved to {path}")
    except Exception as e:
        print(f"Error saving workflow '{workflow_id}': {e}")
        raise

def run_workflow(workflow_id: str):
    """
    Simulates running a workflow.
    In a real application, this would trigger an asynchronous task.
    """
    workflow_data = load_workflow(workflow_id)
    if not workflow_data:
        raise ValueError(f"Workflow '{workflow_id}' not found.")

    print(f"--- Starting execution of workflow: {workflow_data.get('name', workflow_id)} (ID: {workflow_id}) ---")
    
    # Simulate processing steps
    steps = workflow_data.get("steps", [])
    if not steps:
        print(f"Workflow '{workflow_id}' has no steps to run. Done.")
        return

    for i, step in enumerate(steps):
        print(f"  Step {i+1}: Type={step.get('type')}, Details={step}")
        time.sleep(1) # Simulate work

        # Basic dummy logic for different step types
        step_type = step.get("type")
        if step_type == "log":
            print(f"    LOG: {step.get('message')}")
        elif step_type == "data_fetch":
            print(f"    FETCHING from {step.get('source')}...")
        elif step_type == "transform":
            print(f"    TRANSFORMING with {step.get('script')}...")
        elif step_type == "ai_generate":
            print(f"    AI GENERATION using {step.get('model')} with prompt '{step.get('prompt')[:50]}...' (Actual generation happens via API endpoint).")
        else:
            print(f"    UNKNOWN step type: {step_type}")

    print(f"--- Workflow '{workflow_id}' execution completed ---")

# Ensure workflows directory exists on import
if not os.path.exists(WORKFLOWS_DIR):
    os.makedirs(WORKFLOWS_DIR)

# Local testing block
if __name__ == '__main__':
    print("--- Testing workflow_manager.py locally ---")

    # Create dummy workflows if they don't exist
    if not os.path.exists(_get_workflow_path('test_workflow_1')):
        save_workflow('test_workflow_1', {
            "id": "test_workflow_1",
            "name": "Local Test Workflow 1",
            "description": "A simple workflow for local testing.",
            "steps": [{"type": "log", "message": "Hello from Test Workflow 1"}]
        })
    
    if not os.path.exists(_get_workflow_path('test_workflow_2')):
        save_workflow('test_workflow_2', {
            "id": "test_workflow_2",
            "name": "Local Test Workflow 2",
            "description": "Another workflow for local testing with more steps.",
            "steps": [
                {"type": "log", "message": "Starting Test Workflow 2"},
                {"type": "data_fetch", "source": "dummy_data"},
                {"type": "log", "message": "Finished Test Workflow 2"}
            ]
        })

    print("\nListing workflows:")
    for wf in list_workflows():
        print(f"- {wf['name']} (ID: {wf['id']})")

    print("\nRunning 'test_workflow_1':")
    try:
        run_workflow('test_workflow_1')
    except Exception as e:
        print(f"Error during run: {e}")

    print("\nLoading 'test_workflow_2':")
    data = load_workflow('test_workflow_2')
    print(json.dumps(data, indent=2))

    print("\nRunning a non-existent workflow:")
    try:
        run_workflow('non_existent_workflow')
    except ValueError as e:
        print(f"Caught expected error: {e}")