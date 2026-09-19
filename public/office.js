// Interactive Canvas Office with Drag & Drop, Pixel Sound Effects & Hover Tooltips

let canvas, ctx;
let agentMap = {};
let selectedAgentId = null;
let draggingAgentId = null;
let dragOffsetX = 0, dragOffsetY = 0;
let tooltipEl = null;

// Sound Effects via Web Audio API
let audioCtx = null;
window.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
}

function playPixelSound(type) {
  if (!window.soundEnabled) return;
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'EXECUTING') {
      // 8-bit synth pulse up
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'DONE') {
      // 8-bit victory chime (arpeggio)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch (_) {}
}

window.toggleSound = () => {
  window.soundEnabled = !window.soundEnabled;
  localStorage.setItem('soundEnabled', window.soundEnabled);
  updateSoundUI();
};

function updateSoundUI() {
  const icon = document.getElementById('sound-icon');
  const text = document.getElementById('sound-text');
  if (icon && text) {
    icon.textContent = window.soundEnabled ? '🔊' : '🔇';
    text.textContent = window.soundEnabled ? 'Sound: ON' : 'Sound: OFF';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('office');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  // Tooltip DOM element creation
  tooltipEl = document.createElement('div');
  tooltipEl.style.position = 'absolute';
  tooltipEl.style.padding = '6px 10px';
  tooltipEl.style.background = 'rgba(15, 22, 41, 0.92)';
  tooltipEl.style.border = '1px solid #3b82f6';
  tooltipEl.style.borderRadius = '6px';
  tooltipEl.style.color = '#e2e8f0';
  tooltipEl.style.fontSize = '11px';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.display = 'none';
  tooltipEl.style.zIndex = '1000';
  tooltipEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
  tooltipEl.style.whiteSpace = 'pre-line';
  document.body.appendChild(tooltipEl);

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  updateSoundUI();

  // Mouse interaction for drag & drop and tooltips
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', () => {
    draggingAgentId = null;
    if (tooltipEl) tooltipEl.style.display = 'none';
  });

  // Fetch initial agent data immediately
  fetch('/api/agents')
    .then(r => r.json())
    .then(agents => {
      if (Array.isArray(agents)) {
        agents.forEach(a => window.officeUpdateAgent(a));
      }
    })
    .catch(_ => {});

  requestAnimationFrame(renderLoop);
});

function resizeCanvas() {
  const container = document.getElementById('office-container');
  if (container && canvas) {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
}

// Global hook for SSE updates
window.officeUpdateAgent = (agent) => {
  if (!agent || !agent.id) return;
  const prev = agentMap[agent.id];

  // Play synth sound on state transition
  if (prev && prev.state !== agent.state) {
    if (agent.state === 'EXECUTING') playPixelSound('EXECUTING');
    if (agent.state === 'DONE') playPixelSound('DONE');
  }

  const defaultPositions = {
    lead: { x: 100, y: 90 },
    coder: { x: 360, y: 90 },
    researcher: { x: 100, y: 270 },
    qa: { x: 360, y: 270 }
  };

  let desk = defaultPositions[agent.id] || agent.desk;
  if (!desk || (desk.x === 100 && desk.y === 100 && agent.id !== 'lead')) {
    const keys = Object.keys(agentMap);
    const count = keys.includes(agent.id) ? keys.indexOf(agent.id) : keys.length;
    const col = count % 3;
    const row = Math.floor(count / 3);
    desk = { x: 100 + col * 260, y: 90 + row * 180 };
  }

  const savedDesk = localStorage.getItem(`desk_${agent.id}`);
  if (savedDesk) {
    try { desk = JSON.parse(savedDesk); } catch (_) {}
  }

  agentMap[agent.id] = {
    ...agentMap[agent.id],
    ...agent,
    desk
  };
};

function getAgentColor(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('orchestrator') || r.includes('lead')) return '#3b82f6';
  if (r.includes('engineer') || r.includes('coder') || r.includes('dev')) return '#22c55e';
  if (r.includes('researcher') || r.includes('scout')) return '#f97316';
  if (r.includes('tester') || r.includes('qa')) return '#a855f7';
  return '#64748b';
}

function renderLoop() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Grid background
  ctx.strokeStyle = 'rgba(30, 45, 74, 0.25)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Render Desks and Avatars
  Object.values(agentMap).forEach(agent => {
    const { x, y } = agent.desk || { x: 100, y: 100 };
    const width = 120;
    const height = 70;
    const color = getAgentColor(agent.role);

    // Draw Desk Table
    ctx.fillStyle = '#131d33';
    ctx.strokeStyle = agent.id === selectedAgentId ? '#3b82f6' : '#1e2d4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();

    // Computer Monitor on desk
    ctx.fillStyle = '#0f1629';
    ctx.fillRect(x + 35, y + 10, 50, 22);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 35, y + 10, 50, 22);

    // Screen light pulse if executing/thinking
    if (agent.state === 'EXECUTING' || agent.state === 'THINKING') {
      ctx.fillStyle = agent.state === 'EXECUTING' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)';
      ctx.fillRect(x + 37, y + 12, 46, 18);
    }

    // Avatar Circle
    const avatarX = x + width / 2;
    const avatarY = y + height - 12;
    const radius = 16;

    ctx.beginPath();
    ctx.arc(avatarX, avatarY, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Initial letter
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(agent.id.charAt(0).toUpperCase(), avatarX, avatarY);

    // Agent Name & State Tag
    ctx.font = '10px "SF Mono", monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(agent.name, avatarX, y - 10);

    // State Badge
    ctx.font = 'bold 8px "SF Mono", monospace';
    if (agent.state === 'EXECUTING') ctx.fillStyle = '#22c55e';
    else if (agent.state === 'THINKING') ctx.fillStyle = '#eab308';
    else if (agent.state === 'DONE') ctx.fillStyle = '#3b82f6';
    else ctx.fillStyle = '#64748b';
    ctx.fillText(`[${agent.state}]`, avatarX, y + height + 12);
  });

  requestAnimationFrame(renderLoop);
}

// Mouse Event Handlers for Canvas
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function findAgentAtPos(pos) {
  return Object.values(agentMap).find(agent => {
    const { x, y } = agent.desk || { x: 100, y: 100 };
    return pos.x >= x && pos.x <= x + 120 && pos.y >= y && pos.y <= y + 70;
  });
}

function onMouseDown(e) {
  initAudio();
  const pos = getMousePos(e);
  const agent = findAgentAtPos(pos);
  if (agent) {
    selectedAgentId = agent.id;
    draggingAgentId = agent.id;
    dragOffsetX = pos.x - agent.desk.x;
    dragOffsetY = pos.y - agent.desk.y;
    if (window.selectAgentInUI) window.selectAgentInUI(agent.id);
  } else {
    selectedAgentId = null;
  }
}

function onMouseMove(e) {
  const pos = getMousePos(e);

  // Dragging handling
  if (draggingAgentId && agentMap[draggingAgentId]) {
    const newX = Math.max(0, Math.min(canvas.width - 120, pos.x - dragOffsetX));
    const newY = Math.max(0, Math.min(canvas.height - 70, pos.y - dragOffsetY));

    agentMap[draggingAgentId].desk = { x: newX, y: newY };
    localStorage.setItem(`desk_${draggingAgentId}`, JSON.stringify({ x: newX, y: newY }));
  }

  // Hover Tooltip handling
  const hoveredAgent = findAgentAtPos(pos);
  if (hoveredAgent && tooltipEl) {
    const taskStr = hoveredAgent.currentTask ? `Task: ${hoveredAgent.currentTask}` : 'Task: (Idle)';
    const logStr = hoveredAgent.log ? `Log: ${hoveredAgent.log}` : 'Log: Ready';
    const skillStr = hoveredAgent.skills ? `Skills: ${hoveredAgent.skills.join(', ')}` : '';

    tooltipEl.innerHTML = `<strong>${hoveredAgent.name}</strong> (${hoveredAgent.role})\n${skillStr ? skillStr + '\n' : ''}${taskStr}\n<em>${logStr}</em>`;
    tooltipEl.style.left = `${e.clientX + 12}px`;
    tooltipEl.style.top = `${e.clientY + 12}px`;
    tooltipEl.style.display = 'block';
  } else if (tooltipEl) {
    tooltipEl.style.display = 'none';
  }
}

function onMouseUp() {
  if (draggingAgentId && agentMap[draggingAgentId]) {
    const agent = agentMap[draggingAgentId];
    // Sync desk position to backend server
    fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: agent.id, desk: agent.desk })
    }).catch(() => {});
  }
  draggingAgentId = null;
}
