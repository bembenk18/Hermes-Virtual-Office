// office.js – pixel‑art office visualization
(() => {
  const canvas = document.getElementById('office');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('office-container');
  const GRID = 32;
  const DESK_W = 80, DESK_H = 50;
  const AGENT_SZ = 24;
  const desks = {
    lead: {x:100, y:100, color:'#2d4a6e', label:'lead'},
    coder: {x:350, y:100, color:'#2d6e4a', label:'coder'},
    researcher: {x:100, y:280, color:'#6e4a2d', label:'researcher'},
    qa: {x:350, y:280, color:'#6e2d5a', label:'qa'}
  };
  const stateColors = {
    IDLE: '#8b949e',
    THINKING: '#d29922',
    EXECUTING: '#3fb950',
    DONE: '#58a6ff'
  };
  const agents = {};
  let lastTime = 0;

  const resize = () => {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
  };
  window.addEventListener('resize', resize);
  resize();

  function drawGrid() {
    ctx.strokeStyle = '#1a2030';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }

  function drawDesks() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '10px sans-serif';
    for (const d of Object.values(desks)) {
      ctx.fillStyle = d.color;
      ctx.fillRect(d.x, d.y, DESK_W, DESK_H);
      ctx.fillStyle = '#e6edf3';
      ctx.fillText(d.label, d.x + DESK_W/2, d.y + DESK_H + 2);
    }
  }

  function drawAgent(agent, t) {
    const desk = desks[agent.role];
    if (!desk) return;
    const baseX = desk.x + DESK_W/2 - AGENT_SZ/2;
    const baseY = desk.y + DESK_H/2 - AGENT_SZ/2;
    let offsetY = 0, opacity = 1;
    if (agent.state === 'THINKING') {
      opacity = 0.6 + 0.4 * Math.abs(Math.sin(t * 2));
    } else if (agent.state === 'EXECUTING') {
      offsetY = Math.sin(t * 4) * 4;
    }
    ctx.globalAlpha = opacity;
    ctx.fillStyle = stateColors[agent.state] || '#fff';
    ctx.fillRect(baseX, baseY + offsetY, AGENT_SZ, AGENT_SZ);
    ctx.globalAlpha = 1;
    // name above
    ctx.fillStyle = '#e6edf3';
    ctx.font = '10px sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    ctx.fillText(agent.name, baseX + AGENT_SZ/2, baseY + offsetY - 2);
    // thought bubble for THINKING
    if (agent.state === 'THINKING') {
      const bubbleW = 20, bubbleH = 14;
      const bx = baseX + AGENT_SZ/2 - bubbleW/2;
      const by = baseY + offsetY - bubbleH - 6;
      ctx.fillStyle = '#fff';
      roundRect(bx, by, bubbleW, bubbleH, 4, true, false);
      ctx.fillStyle = '#000';
      ctx.font = '8px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('...', bx + bubbleW/2, by + bubbleH/2);
    }
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function draw(timestamp) {
    const t = timestamp / 1000; // seconds
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawGrid();
    drawDesks();
    for (const a of Object.values(agents)) {
      drawAgent(a, t);
    }
    requestAnimationFrame(draw);
  }

  function officeUpdateAgent(agent) {
    // agent: {id, name, role, state}
    agents[agent.id] = {name: agent.name, role: agent.role, state: agent.state};
  }
  // expose
  window.officeUpdateAgent = officeUpdateAgent;

  // SSE connection
  const evt = new EventSource('/api/events');
  evt.addEventListener('message', e => {
    try { const data = JSON.parse(e.data); if (data.type === 'agent_update') officeUpdateAgent(data.payload); }
    catch (_) {}
  });

  requestAnimationFrame(draw);
})();
