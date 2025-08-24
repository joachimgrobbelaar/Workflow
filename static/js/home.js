// static/js/home.js
document.addEventListener('DOMContentLoaded', () => {
    const workflowListDiv = document.getElementById('workflow-list');
    const loadingMessage = document.getElementById('loading-message');
    const noWorkflowsMessage = document.getElementById('no-workflows-message');

    const aiPromptInput = document.getElementById('ai-prompt-input');
    const aiModelSelect = document.getElementById('ai-model-select');
    const aiTemperatureSlider = document.getElementById('ai-temperature-slider');
    const temperatureValueSpan = document.getElementById('temperature-value');
    const generateAiContentBtn = document.getElementById('generate-ai-content-btn');
    const aiOutputTextarea = document.getElementById('ai-output');
    const aiStatusMessageDiv = document.getElementById('ai-status-message');

    // --- Utility Functions ---
    const displayStatus = (element, message, isError = false) => {
        element.textContent = message;
        element.className = isError ? 'status-message error' : 'status-message success';
        element.style.display = 'block';
    };

    const clearStatus = (element) => {
        element.textContent = '';
        element.className = 'status-message';
        element.style.display = 'none';
    };

    // --- Workflow Loading ---
    async function fetchWorkflows() {
        loadingMessage.style.display = 'block';
        workflowListDiv.innerHTML = ''; // Clear previous content except loading message
        noWorkflowsMessage.style.display = 'none';

        try {
            const response = await fetch('/api/workflows');
            const workflows = await response.json();

            loadingMessage.style.display = 'none'; // Hide loading message

            if (workflows.length === 0) {
                noWorkflowsMessage.style.display = 'block';
                return;
            }

            workflows.forEach(workflow => {
                const workflowCard = document.createElement('div');
                workflowCard.className = 'workflow-card';
                workflowCard.innerHTML = `
                    <h3>${workflow.name}</h3>
                    <p>${workflow.description}</p>
                    <div class="workflow-actions">
                        <button class="run-workflow-btn" data-workflow-id="${workflow.id}">Run Workflow</button>
                        <button class="edit-workflow-btn" data-workflow-id="${workflow.id}" onclick="location.href='/edit/${workflow.id}'">Edit Workflow</button>
                    </div>
                    <div id="status-${workflow.id}" class="status-message"></div>
                `;
                workflowListDiv.appendChild(workflowCard);
            });

            // Attach event listeners to new "Run Workflow" buttons
            document.querySelectorAll('.run-workflow-btn').forEach(button => {
                button.addEventListener('click', handleRunWorkflow);
            });

        } catch (error) {
            loadingMessage.style.display = 'none';
            displayStatus(workflowListDiv, 'Error loading workflows: ' + error.message, true);
        }
    }

    // --- Workflow Running ---
    async function handleRunWorkflow(event) {
        const button = event.target;
        const workflowId = button.dataset.workflowId;
        const workflowStatusDiv = document.getElementById(`status-${workflowId}`);

        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = 'Running...';
        clearStatus(workflowStatusDiv);
        displayStatus(workflowStatusDiv, `Starting workflow '${workflowId}'...`);

        try {
            const response = await fetch(`/api/run_workflow/${workflowId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();

            if (result.status === 'success') {
                displayStatus(workflowStatusDiv, result.message, false);
            } else {
                displayStatus(workflowStatusDiv, result.message, true);
            }
        } catch (error) {
            displayStatus(workflowStatusDiv, 'Network error: ' + error.message, true);
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    // --- AI Content Generation ---
    aiTemperatureSlider.addEventListener('input', () => {
        temperatureValueSpan.textContent = aiTemperatureSlider.value;
    });

    generateAiContentBtn.addEventListener('click', async () => {
        const prompt = aiPromptInput.value.trim();
        const model = aiModelSelect.value;
        const temperature = parseFloat(aiTemperatureSlider.value);

        if (!prompt) {
            displayStatus(aiStatusMessageDiv, 'Please enter a prompt.', true);
            return;
        }

        generateAiContentBtn.disabled = true;
        const originalText = generateAiContentBtn.textContent;
        generateAiContentBtn.textContent = 'Generating...';
        aiOutputTextarea.value = '';
        clearStatus(aiStatusMessageDiv);
        displayStatus(aiStatusMessageDiv, `Requesting content from ${model} model...`);

        try {
            const response = await fetch('/api/generate_ai_content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model, temperature })
            });
            const result = await response.json();

            if (result.status === 'success') {
                aiOutputTextarea.value = result.generated_text;
                displayStatus(aiStatusMessageDiv, 'Content generated successfully!', false);
            } else {
                aiOutputTextarea.value = `Error: ${result.message}`;
                displayStatus(aiStatusMessageDiv, result.message, true);
            }
        } catch (error) {
            aiOutputTextarea.value = `Network error: ${error.message}`;
            displayStatus(aiStatusMessageDiv, 'Network error: ' + error.message, true);
        } finally {
            generateAiContentBtn.textContent = originalText;
            generateAiContentBtn.disabled = false;
        }
    });

    // Initial fetch of workflows when page loads
    fetchWorkflows();
});