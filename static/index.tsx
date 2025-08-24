
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import "./index.css";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 100;

const initialSettings = (type) => {
  switch (type) {
    case "prompt":
      return { llm: "gemini-2.5-flash", promptText: "Enter your prompt here..." };
    case "iteration":
      return {
        loopType: "for",
        initialization: "let i = 0",
        condition: "i < 10",
        increment: "i++",
      };
    case "output":
      return { outputType: "console", action: "download" };
    case "process":
      return { processType: "merge" };
    case "input":
      return { inputType: "text", inputText: "Enter text content here...", url: "" };
    default:
      return {};
  }
};

const defaultColors = {
  prompt: "#e3f2fd",
  iteration: "#fff3e0",
  output: "#e8f5e9",
  process: "#f3e5f5",
  input: "#ede7f6",
};

const downloadFile = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
};

const SettingsPanel = ({ node, onSave, onClose }) => {
  const [formData, setFormData] = useState(node);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, [name]: value },
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div
      className="settings-overlay"
      style={{
        left: `${node.x + NODE_WIDTH + 20}px`,
        top: `${node.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSave}>
        <div className="settings-header">
          <h3>Edit Node</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close settings"><i className="fas fa-times"></i></button>
        </div>

        <div className="settings-field">
          <label htmlFor="name">Name</label>
          <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} />
        </div>

        <div className="settings-field">
          <label htmlFor="color">Color</label>
          <input type="color" id="color" name="color" value={formData.color} onChange={handleChange} />
        </div>

        {node.type === "input" && (
          <>
            <div className="settings-field">
              <label>Input Type</label>
              <div className="radio-group">
                <label>
                  <input type="radio" name="inputType" value="text" checked={formData.settings.inputType === 'text'} onChange={handleSettingsChange} />
                  Text
                </label>
                <label>
                  <input type="radio" name="inputType" value="url" checked={formData.settings.inputType === 'url'} onChange={handleSettingsChange} />
                  URL
                </label>
              </div>
            </div>
            {formData.settings.inputType === 'text' ? (
              <div className="settings-field">
                <label htmlFor="inputText">Text</label>
                <textarea id="inputText" name="inputText" value={formData.settings.inputText} onChange={handleSettingsChange}></textarea>
              </div>
            ) : (
              <div className="settings-field">
                <label htmlFor="url">URL</label>
                <input type="text" id="url" name="url" value={formData.settings.url} onChange={handleSettingsChange} />
              </div>
            )}
          </>
        )}

        {node.type === "prompt" && (
          <>
            <div className="settings-field">
              <label htmlFor="llm">LLM</label>
              <select id="llm" name="llm" value={formData.settings.llm} onChange={handleSettingsChange}>
                <option value="gemini-2.5-flash">Gemini</option>
                <option value="gpt-4">GPT-4</option>
                <option value="deepseek">DeepSeek</option>
                <option value="grok">Grok</option>
              </select>
            </div>
            <div className="settings-field">
              <label htmlFor="promptText">Prompt</label>
              <textarea id="promptText" name="promptText" value={formData.settings.promptText} onChange={handleSettingsChange}></textarea>
            </div>
          </>
        )}

        {node.type === "iteration" && (
           <>
             <div className="settings-field">
               <label htmlFor="loopType">Control Type</label>
               <select id="loopType" name="loopType" value={formData.settings.loopType} onChange={handleSettingsChange}>
                 <option value="for">For Loop</option>
                 <option value="while">While Loop</option>
                 <option value="if">If Condition</option>
               </select>
             </div>
             {formData.settings.loopType === 'for' && (
                <>
                  <div className="settings-field">
                    <label htmlFor="initialization">Initialization</label>
                    <input type="text" id="initialization" name="initialization" value={formData.settings.initialization || ''} onChange={handleSettingsChange} />
                  </div>
                  <div className="settings-field">
                    <label htmlFor="condition">Condition</label>
                    <input type="text" id="condition" name="condition" value={formData.settings.condition || ''} onChange={handleSettingsChange} />
                  </div>
                  <div className="settings-field">
                    <label htmlFor="increment">Increment</label>
                    <input type="text" id="increment" name="increment" value={formData.settings.increment || ''} onChange={handleSettingsChange} />
                  </div>
                </>
             )}
             {(formData.settings.loopType === 'while' || formData.settings.loopType === 'if') && (
                <div className="settings-field">
                    <label htmlFor="condition">Condition</label>
                    <input type="text" id="condition" name="condition" value={formData.settings.condition || ''} onChange={handleSettingsChange} />
                </div>
             )}
           </>
        )}
        
        {node.type === "process" && (
          <div className="settings-field">
            <label htmlFor="processType">Process Type</label>
            <select id="processType" name="processType" value={formData.settings.processType} onChange={handleSettingsChange}>
              <option value="merge">Merge</option>
              <option value="diff">Find Differences</option>
              <option value="common">Find Commonalities</option>
            </select>
          </div>
        )}

        {node.type === "output" && (
           <>
            <div className="settings-field">
             <label htmlFor="outputType">Output Type</label>
             <select id="outputType" name="outputType" value={formData.settings.outputType} onChange={handleSettingsChange}>
               <option value="console">Display in Console</option>
               <option value="pdf">Generate PDF</option>
               <option value="image">Generate Image</option>
               <option value="audio">Generate Audio</option>
             </select>
            </div>
            <div className="settings-field">
             <label htmlFor="action">Action</label>
             <select id="action" name="action" value={formData.settings.action} onChange={handleSettingsChange}>
               <option value="download">Download File</option>
               <option value="newTab">Open in New Tab</option>
             </select>
            </div>
           </>
        )}

        <button type="submit" className="save-settings-btn">Save</button>
      </form>
    </div>
  );
};

const executePipeline = async (workflowData, stateUpdaters) => {
    const { nodes, edges } = workflowData;
    const {
        setIsRunning,
        setCurrentlyExecutingNodeId,
        setOutputLog,
        setGeneratedFiles,
        setStatus, // For home page
    } = stateUpdaters;

    setIsRunning(true);
    setCurrentlyExecutingNodeId?.(null);
    setOutputLog?.([]);
    setGeneratedFiles?.([]);
    setStatus?.('running');

    const log = (message, type = "info") => {
      setOutputLog?.(prev => [...prev, { type, message, time: new Date().toLocaleTimeString() }]);
    };
    
    const addFile = (file) => {
      setGeneratedFiles?.(prev => [...prev, file]);
    };

    try {
      const nodeMap = new Map(nodes.map(node => [node.id, node]));
      const adj = new Map<number, number[]>(nodes.map(node => [node.id, []]));
      const inDegree = new Map<number, number>(nodes.map(node => [node.id, 0]));

      for (const edge of edges) {
        if (adj.has(edge.from) && nodeMap.has(edge.to)) {
          adj.get(edge.from)!.push(edge.to);
          inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
        }
      }

      const queue = nodes.filter(node => (inDegree.get(node.id) || 0) === 0);
      const executionOrder = [];

      while (queue.length > 0) {
        const u = queue.shift();
        executionOrder.push(u);
        if (adj.has(u.id)) {
          for (const v of adj.get(u.id)!) {
            inDegree.set(v, (inDegree.get(v) || 0) - 1);
            if (inDegree.get(v) === 0) {
              const vNode = nodeMap.get(v);
              if (vNode) queue.push(vNode);
            }
          }
        }
      }

      if (executionOrder.length < nodes.length) {
        const executedNodeIds = new Set(executionOrder.map(n => n.id));
        const unexecutedNodes = nodes.filter(n => !executedNodeIds.has(n.id));
        throw new Error(`Cycle detected or nodes are unreachable. The following nodes will not be executed: ${unexecutedNodes.map(n => n.name).join(', ')}`);
      }

      log(`Pipeline execution started. Order: ${executionOrder.map(n => n.name).join(' -> ')}`);
      const outputs = new Map();

      for (const node of executionOrder) {
        try {
          setCurrentlyExecutingNodeId?.(node.id);
          log(`Executing node: ${node.name} (${node.type})`);
          
          const incomingEdges = edges.filter(e => e.to === node.id);
          const inputDataArray = incomingEdges.map(e => outputs.get(e.from)).filter(Boolean);
          let inputData = inputDataArray.join('\n').trim();

          switch (node.type) {
            case 'input': {
              if (incomingEdges.length > 0) {
                log(`Warning: Input node '${node.name}' should not have inputs. It will be ignored.`, 'info');
              }
              const { inputType, inputText, url } = node.settings;
              if (inputType === 'url') {
                log(`Fetching content from URL: ${url}`, 'data');
                if (!url) {
                  throw new Error('URL is empty in Input node.');
                }
                log('Note: Direct URL fetching may be blocked by browser security (CORS). For a robust solution, a server-side proxy is needed.', 'info');
                const response = await fetch(url);
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.text();
                outputs.set(node.id, data);
                log(`Successfully fetched content. Length: ${data.length}`, 'success');
              } else { // 'text'
                log(`Using provided text. Length: ${inputText?.length || 0}`, 'data');
                outputs.set(node.id, inputText || '');
              }
              break;
            }
            case 'prompt': {
                const promptText = inputData || node.settings.promptText;
                const model = node.settings.llm || 'gemini-2.5-flash';
                log(`Sending request to backend for ${model}: "${promptText.substring(0, 100)}..."`, "data");
                
                const response = await fetch('/api/ai-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: model,
                        prompt: promptText,
                        task: 'generate_text'
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Backend API error: ${response.status}`);
                }

                const result = await response.json();
                const text = result.text;

                log(`${model} response: "${text.substring(0, 100)}..."`, "success");
                outputs.set(node.id, text);
                break;
            }
            case 'process':
              if (inputDataArray.length === 0) {
                log(`Process node ${node.name} has no input. Skipping.`, "info");
                outputs.set(node.id, '');
                break;
              }
              const processType = node.settings.processType || 'merge';
              log(`Processing ${inputDataArray.length} inputs with mode: ${processType}`, "data");
              
              const processResponse = await fetch('/api/ai-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'gemini-2.5-flash',
                        inputs: inputDataArray,
                        processType: processType,
                        task: 'process_text'
                    })
              });

              if (!processResponse.ok) {
                  const errorData = await processResponse.json();
                  throw new Error(errorData.error || `Backend API error: ${processResponse.status}`);
              }
              
              const processResult = await processResponse.json();
              const processedText = processResult.text;
              
              outputs.set(node.id, processedText);
              log(`Process result: "${processedText.substring(0, 100)}..."`, "success");
              break;
            case 'output':
              log(`Final Output from ${node.name}:`, "success");
              if (!inputData) {
                log("No input data received.", "error");
                outputs.set(node.id, "");
                continue;
              }
              const action = node.settings.action || 'download';
              switch(node.settings.outputType) {
                case 'pdf': {
                  log(`Generating PDF with content...`, "data");
                  const pdf = new jsPDF();
                  pdf.text(inputData, 10, 10);
                  const pdfDataUri = pdf.output('datauristring');
                  const fileName = `${node.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
                  addFile({ name: fileName, url: pdfDataUri });
                  if (action === 'download') { pdf.save(fileName); } 
                  else { window.open(pdfDataUri, '_blank'); }
                  break;
                }
                case 'image': {
                  log(`Generating Image from prompt via backend...`, "data");
                  const imageResponse = await fetch('/api/ai-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: inputData,
                        task: 'generate_image'
                    })
                  });

                  if (!imageResponse.ok) {
                    const errorData = await imageResponse.json();
                    throw new Error(errorData.error || `Backend API error: ${imageResponse.status}`);
                  }
              
                  const imageResult = await imageResponse.json();
                  const imageUrl = `data:image/png;base64,${imageResult.base64Image}`;
                  const fileName = `${node.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
                  addFile({ name: fileName, url: imageUrl });
                  if (action === 'download') { downloadFile(imageUrl, fileName); } 
                  else { window.open(imageUrl, '_blank'); }
                  break;
                }
                case 'audio': {
                  log(`Generating Audio from text...`, "data");
                  const utterance = new SpeechSynthesisUtterance(inputData);
                  window.speechSynthesis.speak(utterance);
                  const blob = new Blob([inputData], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const fileName = `${node.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
                  addFile({ name: `${fileName} (text content)`, url: url });
                  if (action === 'download') { downloadFile(url, fileName); }
                  break;
                }
                default:
                  log(inputData, "data");
                  break;
              }
              outputs.set(node.id, inputData);
              break;
            case 'iteration':
              log(`Iteration node (logic not implemented), passing input through.`, "info");
              outputs.set(node.id, inputData);
              break;
          }
        } catch (error) {
          log(`Error at node ${node.name}: ${error.message}`, "error");
          throw error;
        }
      }
      log("Pipeline execution finished.");
      setStatus?.('success');
    } catch (error) {
      log(`Pipeline execution aborted: ${error.message}`, "error");
      setStatus?.('error');
    } finally {
      setIsRunning(false);
      setCurrentlyExecutingNodeId?.(null);
    }
};

const EditorPage = ({ workflowId, onNavigateHome }) => {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [comments, setComments] = useState([]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragInfo, setDragInfo] = useState(null);
  const [linkingState, setLinkingState] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredTargetId, setHoveredTargetId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [outputLog, setOutputLog] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [currentlyExecutingNodeId, setCurrentlyExecutingNodeId] = useState(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState(null);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [currentWorkflowId, setCurrentWorkflowId] = useState(workflowId);

  useEffect(() => {
    if (currentWorkflowId) {
        const projectStr = localStorage.getItem(`flowchart-project-${currentWorkflowId}`);
        if (projectStr) {
            const project = JSON.parse(projectStr);
            setNodes(project.nodes || []);
            setEdges(project.edges || []);
            setComments(project.comments || []);
            setPan(project.pan || {x: 0, y: 0});
            setZoom(project.zoom || 1);
            setWorkflowName(project.workflowName || "Untitled Workflow");
        }
    } else {
        setCurrentWorkflowId(Date.now());
    }
  }, [currentWorkflowId]);


  const addNode = (type) => {
    const newNode = {
      id: Date.now(),
      type,
      x: 100 - pan.x / zoom,
      y: 100 - pan.y / zoom,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
      color: defaultColors[type] || "#ffffff",
      settings: initialSettings(type),
    };
    setNodes((prev) => [...prev, newNode]);
  };
  
  const addComment = () => {
    const newComment = {
      id: Date.now(),
      x: 100 - pan.x / zoom,
      y: 100 - pan.y / zoom,
      text: "This is a comment.",
      width: 150,
      height: 60,
    };
    setComments((prev) => [...prev, newComment]);
  }

  const deleteNode = (e, nodeId) => {
    e.stopPropagation();
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(edge => edge.from !== nodeId && edge.to !== nodeId));
  }

  const deleteEdge = (e, edgeId) => {
    e.stopPropagation();
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
  }
  
  const startLinking = (e, fromNodeId) => {
    e.stopPropagation();
    setLinkingState({ from: fromNodeId });
  };


  const handleMouseDown = (e, type, id) => {
    e.stopPropagation();
    const target = e.currentTarget;
    if (e.target.classList.contains('settings-cog') || e.target.classList.contains('delete-node-btn') || e.target.parentElement.classList.contains('delete-node-btn') || e.target.classList.contains('link-handle')) return;

    const rect = target.getBoundingClientRect();
    const offsetX = (e.clientX - rect.left) / zoom;
    const offsetY = (e.clientY - rect.top) / zoom;
    
    if(type === 'comment' && e.target.classList.contains('comment') && (e.offsetX > target.offsetWidth - 10 && e.offsetY > target.offsetHeight - 10)) return;

    setDragInfo({ type, id, offsetX, offsetY });

    if (type === 'canvas') {
      target.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - canvasRect.left);
    const mouseY = (e.clientY - canvasRect.top);
    setMousePosition({ x: mouseX, y: mouseY });

    const scaledMouseX = (mouseX - pan.x) / zoom;
    const scaledMouseY = (mouseY - pan.y) / zoom;

    if (linkingState) {
        let targetFound = false;
        for(const targetNode of nodes) {
            if(targetNode.id === linkingState.from) continue;

            const isOverlapping = 
                scaledMouseX > targetNode.x &&
                scaledMouseX < targetNode.x + NODE_WIDTH &&
                scaledMouseY > targetNode.y &&
                scaledMouseY < targetNode.y + NODE_HEIGHT;
            
            if (isOverlapping) {
                setHoveredTargetId(targetNode.id);
                targetFound = true;
                break;
            }
        }
        if(!targetFound) {
            setHoveredTargetId(null);
        }
        return;
    }


    if (!dragInfo) return;

    if (dragInfo.type === 'node') {
        setNodes(prev => prev.map((n) => (n.id === dragInfo.id ? { ...n, x: scaledMouseX - dragInfo.offsetX, y: scaledMouseY - dragInfo.offsetY } : n)));
    } else if(dragInfo.type === 'comment') {
      setComments((prev) => prev.map((c) => (c.id === dragInfo.id ? { ...c, x: scaledMouseX - dragInfo.offsetX, y: scaledMouseY - dragInfo.offsetY } : c)));
    } else if (dragInfo.type === 'canvas') {
      setPan(prev => ({x: prev.x + e.movementX, y: prev.y + e.movementY}))
    }
  }, [dragInfo, zoom, pan, nodes, linkingState]);

  const handleMouseUp = useCallback(() => {
    if (linkingState && hoveredTargetId) {
        const fromNodeId = linkingState.from;
        const toNodeId = hoveredTargetId;
        const targetNode = nodes.find(n => n.id === toNodeId);
        
        const edgeExists = edges.some(e => e.from === fromNodeId && e.to === toNodeId);
        if (!edgeExists) {
            const incomingEdges = edges.filter(e => e.to === toNodeId);
            const newEdge = { id: `edge-${fromNodeId}-${toNodeId}`, from: fromNodeId, to: toNodeId };

            if (targetNode.type === 'process' && incomingEdges.length >= 3) {
                alert('Process block cannot have more than 3 inputs.');
            } else if (targetNode.type === 'prompt' || targetNode.type === 'iteration' || targetNode.type === 'input') {
                // These nodes replace their input
                setEdges(prev => [...prev.filter(e => e.to !== toNodeId), newEdge]);
            } else {
                // For output and process (within limit), allow multiple inputs
                setEdges(prev => [...prev, newEdge]);
            }
        }
    }

    if (dragInfo && dragInfo.type === 'canvas' && canvasRef.current) {
        canvasRef.current.style.cursor = 'grab';
    }
    setDragInfo(null);
    setLinkingState(null);
    setHoveredTargetId(null);
  }, [linkingState, hoveredTargetId, edges, nodes, dragInfo]);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && linkingState) {
            setLinkingState(null);
            setHoveredTargetId(null);
        }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleMouseMove, handleMouseUp, linkingState]);
  
  const handleWheel = (e) => {
    e.preventDefault();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const scaleAmount = 1.1;
    const newZoom = e.deltaY > 0 ? zoom / scaleAmount : zoom * scaleAmount;
    const clampedZoom = Math.max(0.1, Math.min(newZoom, 5));

    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    const mousePoint = {
        x: (mouseX - pan.x) / zoom,
        y: (mouseY - pan.y) / zoom,
    };

    const newPan = {
        x: mouseX - mousePoint.x * clampedZoom,
        y: mouseY - mousePoint.y * clampedZoom,
    };

    setZoom(clampedZoom);
    setPan(newPan);
  };
  
  const handleUpdateNode = (updatedNode) => {
      setNodes(prev => prev.map(n => n.id === updatedNode.id ? updatedNode : n));
  };
  
  const handleCommentTextChange = (id, newText) => {
      setComments(prev => prev.map(c => c.id === id ? {...c, text: newText} : c));
  }
  
  const saveProject = () => {
    if (!currentWorkflowId) {
        alert("Cannot save, workflow has no ID.");
        return;
    }
    const project = { id: currentWorkflowId, workflowName, nodes, edges, comments, pan, zoom };
    localStorage.setItem(`flowchart-project-${currentWorkflowId}`, JSON.stringify(project));
    alert("Project Saved!");
  };

  const getEdgePath = (fromNode, toNode) => {
      if(!fromNode || !toNode) return "";
      const fromX = fromNode.x + NODE_WIDTH;
      const fromY = fromNode.y + NODE_HEIGHT / 2;
      const toX = toNode.x;
      const toY = toNode.y + NODE_HEIGHT / 2;
      const dx = toX - fromX;
      return `M ${fromX},${fromY} C ${fromX + dx/2},${fromY} ${toX - dx/2},${toY} ${toX},${toY}`;
  }

  const getEdgeMidpoint = (fromNode, toNode) => {
    if (!fromNode || !toNode) return { x: 0, y: 0 };
    const fromX = fromNode.x + NODE_WIDTH;
    const fromY = fromNode.y + NODE_HEIGHT / 2;
    const toX = toNode.x;
    const toY = toNode.y + NODE_HEIGHT / 2;
    const dx = toX - fromX;

    const p0 = { x: fromX, y: fromY };
    const p1 = { x: fromX + dx / 2, y: fromY };
    const p2 = { x: toX - dx / 2, y: toY };
    const p3 = { x: toX, y: toY };
    
    // Calculate point at t=0.5 for the cubic bezier curve
    const t = 0.5;
    const x = Math.pow(1-t, 3) * p0.x + 3 * Math.pow(1-t, 2) * t * p1.x + 3 * (1-t) * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x;
    const y = Math.pow(1-t, 3) * p0.y + 3 * Math.pow(1-t, 2) * t * p1.y + 3 * (1-t) * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y;

    return { x, y };
  }
  
  const getGhostEdgePath = () => {
    if (!linkingState) return "";
    const fromNode = nodes.find(n => n.id === linkingState.from);
    if (!fromNode) return "";

    const fromX = (fromNode.x + NODE_WIDTH) * zoom + pan.x;
    const fromY = (fromNode.y + NODE_HEIGHT / 2) * zoom + pan.y;
    const toX = mousePosition.x;
    const toY = mousePosition.y;
    const dx = toX - fromX;

    return `M ${fromX},${fromY} C ${fromX + dx/2},${fromY} ${toX - dx/2},${toY} ${toX},${toY}`;
  }

  const handleRun = () => {
    const stateUpdaters = {
        setIsRunning,
        setCurrentlyExecutingNodeId,
        setOutputLog,
        setGeneratedFiles
    };
    executePipeline({ nodes, edges }, stateUpdaters);
  };
  
  const editingNode = nodes.find(n => n.id === editingNodeId);

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-section">
            <button onClick={() => addNode("input")}><i className="fas fa-file-import"></i> Input</button>
            <button onClick={() => addNode("prompt")}><i className="fas fa-terminal"></i> Prompt</button>
            <button onClick={() => addNode("iteration")}><i className="fas fa-sync-alt"></i> Iteration</button>
            <button onClick={() => addNode("process")}><i className="fas fa-cogs"></i> Process</button>
            <button onClick={() => addNode("output")}><i className="fas fa-file-export"></i> Output</button>
            <button onClick={addComment}><i className="fas fa-comment"></i> Add Comment</button>
        </div>

        <div className="toolbar-section toolbar-center">
            <input 
              type="text" 
              className="workflow-name-input" 
              value={workflowName} 
              onChange={(e) => setWorkflowName(e.target.value)} 
              aria-label="Workflow Name"
            />
            <button onClick={handleRun} className="run-btn" disabled={isRunning}><i className="fas fa-play"></i> Run Pipeline</button>
        </div>

        <div className="toolbar-section">
            <button onClick={saveProject}><i className="fas fa-save"></i> Save</button>
            <button onClick={onNavigateHome}><i className="fas fa-home"></i> Home</button>
        </div>
      </div>
      <div
        ref={canvasRef}
        className="canvas-container"
        onMouseDown={(e) => handleMouseDown(e, 'canvas', 'canvas')}
        onWheel={handleWheel}
        style={{ cursor: dragInfo?.type === 'canvas' ? 'grabbing' : 'grab' }}
      >
        <div className="canvas-transformer" style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: 'top left' }}>
            
            {nodes.map((node) => (
              <div
                key={node.id}
                className="node-wrapper"
                onMouseDown={(e) => handleMouseDown(e, 'node', node.id)}
                style={{
                  left: node.x,
                  top: node.y,
                  width: NODE_WIDTH,
                  height: NODE_HEIGHT
                }}
              >
                <div
                  className={`node node-${node.type} ${hoveredTargetId === node.id ? 'is-hovered-target' : ''} ${currentlyExecutingNodeId === node.id ? 'is-executing' : ''}`}
                  style={{
                    backgroundColor: node.color,
                    borderColor: node.color,
                  }}
                >
                  <div className="node-name">{node.name}</div>
                </div>
                <button className="delete-node-btn" onClick={(e) => deleteNode(e, node.id)} aria-label={`Delete ${node.name}`}><i className="fas fa-times"></i></button>
                <button className="settings-cog" onClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id);}} aria-label={`Settings for ${node.name}`}><i className="fas fa-cog"></i></button>
                <div className="link-handle" onMouseDown={(e) => startLinking(e, node.id)}>+</div>
              </div>
            ))}
            {comments.map((comment) => (
               <textarea
                    key={comment.id}
                    className="comment"
                    onMouseDown={(e) => handleMouseDown(e, 'comment', comment.id)}
                    style={{ left: comment.x, top: comment.y, width: comment.width, height: comment.height }}
                    value={comment.text}
                    onChange={(e) => handleCommentTextChange(comment.id, e.target.value)}
                    aria-label="Comment"
                />
            ))}
            {editingNode && <SettingsPanel node={editingNode} onSave={handleUpdateNode} onClose={() => setEditingNodeId(null)} />}
        </div>
        <svg className="edge-svg">
              <defs>
                  <marker
                    id="arrowhead"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" />
                  </marker>
              </defs>
              <g style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: 'top left' }}>
                  {edges.map(edge => {
                      const fromNode = nodes.find(n => n.id === edge.from);
                      const toNode = nodes.find(n => n.id === edge.to);
                      if (!fromNode || !toNode) return null;

                      const path = getEdgePath(fromNode, toNode);
                      const midPoint = getEdgeMidpoint(fromNode, toNode);

                      return (
                          <g 
                            key={edge.id} 
                            onMouseEnter={() => setHoveredEdgeId(edge.id)} 
                            onMouseLeave={() => setHoveredEdgeId(null)}
                          >
                              <path className="edge-path" d={path} markerEnd="url(#arrowhead)" />
                              <path className="edge-hover-path" d={path} />
                              {hoveredEdgeId === edge.id && (
                                  <foreignObject x={midPoint.x - 12} y={midPoint.y - 12} width="24" height="24">
                                      <button 
                                        className="edge-delete-btn" 
                                        onClick={(e) => deleteEdge(e, edge.id)}
                                        aria-label="Delete link"
                                      >
                                          <i className="fas fa-times"></i>
                                      </button>
                                  </foreignObject>
                              )}
                          </g>
                      )
                  })}
              </g>
              {linkingState && <path className="ghost-edge-path" d={getGhostEdgePath()} />}
        </svg>
        {isRunning && <div className="loader-overlay"><div className="loader"></div><p style={{color: 'white', marginTop: '20px'}}>Running Pipeline...</p></div>}
      </div>
      <div className="bottom-panels">
        {generatedFiles.length > 0 && (
            <div className="generated-files">
                <div className="generated-files-header">
                    <span>Generated Files</span>
                    <button onClick={() => setGeneratedFiles([])}>Clear</button>
                </div>
                <div className="generated-files-content">
                    {generatedFiles.map((file, i) => (
                        <div key={i}>
                           <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer">{file.name}</a>
                        </div>
                    ))}
                </div>
            </div>
        )}
        <div className="output-console">
          <div className="console-header">Output Console</div>
          <div className="console-content">
            {outputLog.map((log, i) => (
                <div key={i}>
                    <span>[{log.time}] </span>
                    <span className={`log-${log.type}`}>{log.message}</span>
                </div>
            ))}
          </div>
        </div>
       </div>
    </div>
  );
};

const HomePage = ({ onNavigateToEditor }) => {
    const [workflows, setWorkflows] = useState([]);
    const [runningStates, setRunningStates] = useState({}); // { [id]: 'running' | 'success' | 'error' }
    const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('workflow-theme') || 'light-default');


    const listWorkflows = () => {
        const items = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('flowchart-project-')) {
                try {
                    const project = JSON.parse(localStorage.getItem(key));
                    items.push({ id: project.id, name: project.workflowName, data: project });
                } catch (e) {
                    console.error("Could not parse workflow from localStorage", e);
                }
            }
        }
        setWorkflows(items);
    };

    useEffect(() => {
        listWorkflows();
    }, []);

    const handleRunWorkflow = (workflow) => {
        const stateUpdaters = {
            setIsRunning: (isRunning) => {
                setRunningStates(prev => ({
                    ...prev,
                    [workflow.id]: isRunning ? 'running' : prev[workflow.id]
                }));
            },
            setStatus: (status) => {
                setRunningStates(prev => ({ ...prev, [workflow.id]: status }));
                 // Reset status after a few seconds
                 setTimeout(() => {
                    setRunningStates(prev => {
                        const newStates = {...prev};
                        delete newStates[workflow.id];
                        return newStates;
                    });
                 }, 5000);
            },
            // Dummy setters for unused functionality on home page
            setCurrentlyExecutingNodeId: () => {},
            setOutputLog: () => {},
            setGeneratedFiles: () => {},
        };
        executePipeline(workflow.data, stateUpdaters);
    };

    const deleteWorkflow = (id) => {
        if (window.confirm("Are you sure you want to delete this workflow?")) {
            localStorage.removeItem(`flowchart-project-${id}`);
            listWorkflows();
        }
    };
    
    const handleThemeChange = (e) => {
        const newTheme = e.target.value;
        setCurrentTheme(newTheme);
        localStorage.setItem('workflow-theme', newTheme);
        document.body.setAttribute('data-theme', newTheme);
    };

    return (
        <div className="home-page-container">
            <header className="home-header">
                <h1>Workflow Dashboard</h1>
                <div className="header-actions">
                    <div className="theme-selector-wrapper">
                        <i className="fas fa-palette"></i>
                        <select value={currentTheme} onChange={handleThemeChange} aria-label="Select Theme">
                            <option value="light-default">Default Light</option>
                            <option value="light-breeze">Breeze</option>
                            <option value="dark-ocean">Ocean</option>
                            <option value="dark-midnight">Midnight</option>
                            <option value="dark-ember">Ember</option>
                        </select>
                    </div>
                    <button className="create-workflow-btn" onClick={() => onNavigateToEditor(null)}>
                        <i className="fas fa-plus"></i> Create New Workflow
                    </button>
                </div>
            </header>
            <main className="workflow-list">
                {workflows.length === 0 ? (
                    <p className="no-workflows-message">No saved workflows found. Create one to get started!</p>
                ) : (
                    workflows.map(wf => {
                        const status = runningStates[wf.id];
                        return (
                            <div key={wf.id} className={`workflow-card status-${status || 'idle'}`}>
                                <div className="workflow-card-header">
                                    <h2 className="workflow-name">{wf.name}</h2>
                                    <div className="workflow-status">
                                        {status === 'running' && <><div className="loader small"></div><span>Running...</span></>}
                                        {status === 'success' && <><i className="fas fa-check-circle"></i><span>Success</span></>}
                                        {status === 'error' && <><i className="fas fa-exclamation-circle"></i><span>Error</span></>}
                                    </div>
                                </div>
                                <div className="workflow-actions">
                                    <button onClick={() => onNavigateToEditor(wf.id)} className="edit-btn" disabled={!!status}>
                                        <i className="fas fa-edit"></i> Edit
                                    </button>
                                    <button onClick={() => handleRunWorkflow(wf)} className="run-btn" disabled={!!status}>
                                        <i className="fas fa-play"></i> Run
                                    </button>
                                    <button onClick={() => deleteWorkflow(wf.id)} className="delete-btn" disabled={!!status}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>
        </div>
    );
};

const App = () => {
    const [view, setView] = useState('home'); // 'home' or 'editor'
    const [activeWorkflowId, setActiveWorkflowId] = useState(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem('workflow-theme') || 'light-default';
        document.body.setAttribute('data-theme', savedTheme);
    }, []);

    const navigateToEditor = (id) => {
        setActiveWorkflowId(id);
        setView('editor');
    };

    const navigateToHome = () => {
        setActiveWorkflowId(null);
        setView('home');
    };

    if (view === 'home') {
        return <HomePage onNavigateToEditor={navigateToEditor} />;
    }

    return <EditorPage workflowId={activeWorkflowId} onNavigateHome={navigateToHome} />;
}


const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
