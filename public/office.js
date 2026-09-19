// office.js – Pixel-Art Office Canvas Visualization
(() => {
  const canvas = document.getElementById('office');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('office-container');

  const GRID = 32;
  const DESK_W = 90, DESK_H = 54;
  const AGENT_SZ = 26;

  // Fixed desk coordinates & colors
  const desks = {
    lead:       { id: 'lead',       x: 100, y: 90,  color: '#1e3a5f', border: '#3b82f6', label: 'Hermes Lead', role: 'Orchestrator' },
    coder:      { id: 'coder',      x: 360, y: 90,  color: '#14532d', border: '#22c55e', label: 'Dev SubAgent', role: 'Software Engineer' },
    researcher: { id: 'researcher', x: 100, y: 270, color: '#7c2d12', border: '#f97316', label: 'Web Scout', role: 'Researcher' },
    qa:         { id: 'qa',         x: 360, y: 270, color: '#581c87', border: '#a855f7', label: 'QA Auditor', role: 'Tester' }
  };

  const stateColors = {
    IDLE:      { bg: '#64748b', glow: 'rgba(100,116,139,0.3)', text: '#94a3b8' },
    THINKING:  { bg: '#eab308', glow: 'rgba(234,179,8,0.5)',   text: '#fef08a' },
    EXECUTING: { bg: '#22c55e', glow: 'rgba(34,197,94,0.6)',   text: '#bbf7d0' },
    DONE:      { bg: '#3b82f6', glow: 'rgba(59,130,246,0.5)',  text: '#bfdbfe' }
  };

  // State store
  const agents = {
    lead:       { id: 'lead',       name: 'Hermes Lead', role: 'lead', state: 'IDLE', log: 'Ready' },
    coder:      { id: 'coder',      name: 'Dev SubAgent', role: 'coder', state: 'IDLE', log: 'Ready' },
    researcher: { id: 'researcher', name: 'Web Scout', role: 'researcher', state: 'IDLE', log: 'Ready' },
    qa:         { id: 'qa',         name: 'QA Auditor', role: 'qa', state: 'IDLE', log: 'Ready' }
  };

  function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function drawGrid() {
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
  }

  function drawDesks(t) {
    for (const d of Object.values(desks)) {
      // Desk Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(d.x + 4, d.y + 4, DESK_W, DESK_H);

      // Desk Main Body
      ctx.fillStyle = d.color;
      ctx.fillRect(d.x, d.y, DESK_W, DESK_H);

      // Desk Border Top Accent
      ctx.fillStyle = d.border;
      ctx.fillRect(d.x, d.y, DESK_W, 4);

      // Monitor Screen on desk (Pixel Art PC)
      const monitorX = d.x + 10;
      const monitorY = d.y + 8;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(monitorX, monitorY, 24, 18);
      ctx.fillStyle = d.border;
      ctx.fillRect(monitorX + 2, monitorY + 2, 20, 14);

      // Blinking cursor / code lines on monitor
      ctx.fillStyle = (Math.floor(t * 3) % 2 === 0) ? '#ffffff' : '#94a3b8';
      ctx.fillRect(monitorX + 4, monitorY + 5, 8, 2);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(monitorX + 4, monitorY + 9, 12, 2);

      // Chair behind desk
      ctx.fillStyle = '#334155';
      ctx.fillRect(d.x + DESK_W - 22, d.y + 12, 16, 26);

      // Desk Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(d.label.toUpperCase(), d.x + DESK_W / 2, d.y + DESK_H + 6);
    }
  }

  function drawAgent(agent, t) {
    // Map agent role or id to desk
    const roleKey = (agent.role || agent.id || '').toLowerCase();
    let deskKey = Object.keys(desks).find(k => roleKey.includes(k)) || agent.id;
    const desk = desks[deskKey] || desks.lead;

    const baseX = desk.x + DESK_W / 2 - AGENT_SZ / 2;
    const baseY = desk.y + DESK_H / 2 - AGENT_SZ / 2;

    let offsetY = 0;
    let opacity = 1;
    let scale = 1;

    const st = agent.state || 'IDLE';
    const colors = stateColors[st] || stateColors.IDLE;

    if (st === 'IDLE') {
      // Gentle idle breathing floating effect
      offsetY = Math.sin(t * 2 + desk.x) * 1.5;
    } else if (st === 'THINKING') {
      // Pulsing opacity & gentle float
      opacity = 0.55 + 0.45 * Math.abs(Math.sin(t * 4));
      offsetY = Math.sin(t * 3) * 2;
    } else if (st === 'EXECUTING') {
      // Active bouncing up and down (+/- 4px)
      offsetY = -Math.abs(Math.sin(t * 7)) * 6;
    } else if (st === 'DONE') {
      // Subtle victory scale pulse
      scale = 1 + Math.sin(t * 4) * 0.05;
    }

    ctx.save();
    ctx.translate(baseX + AGENT_SZ / 2, baseY + AGENT_SZ / 2 + offsetY);
    ctx.scale(scale, scale);

    // Glow Aura under avatar
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = st === 'EXECUTING' || st === 'THINKING' ? 12 : 4;

    // Agent Avatar Body (Pixel Art Rounded Square)
    ctx.fillStyle = colors.bg;
    ctx.globalAlpha = opacity;
    ctx.fillRect(-AGENT_SZ / 2, -AGENT_SZ / 2, AGENT_SZ, AGENT_SZ);

    // Border highlight
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-AGENT_SZ / 2, -AGENT_SZ / 2, AGENT_SZ, AGENT_SZ);

    // Avatar Eyes (Pixel Expression)
    ctx.fillStyle = '#0f172a';
    if (st === 'THINKING') {
      // Looking up thinking eyes
      ctx.fillRect(-6, -6, 4, 4);
      ctx.fillRect(2, -6, 4, 4);
    } else if (st === 'EXECUTING') {
      // Happy active eyes ^ ^
      ctx.fillRect(-6, -4, 4, 2);
      ctx.fillRect(2, -4, 4, 2);
    } else {
      // Normal eyes
      ctx.fillRect(-6, -2, 4, 4);
      ctx.fillRect(2, -2, 4, 4);
    }

    ctx.restore();

    // Agent Name Above Avatar
    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(agent.name || desk.label, baseX + AGENT_SZ / 2, baseY + offsetY - 4);

    // Thought Bubble for THINKING state
    if (st === 'THINKING') {
      const bubbleW = 32, bubbleH = 18;
      const bx = baseX + AGENT_SZ / 2;
      const by = baseY + offsetY - 28;

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;

      // Rounded bubble
      ctx.beginPath();
      ctx.roundRect(bx - bubbleW / 2, by - bubbleH / 2, bubbleW, bubbleH, 6);
      ctx.fill();
      ctx.stroke();

      // Bubble Tail
      ctx.beginPath();
      ctx.moveTo(bx - 3, by + bubbleH / 2);
      ctx.lineTo(bx, by + bubbleH / 2 + 4);
      ctx.lineTo(bx + 3, by + bubbleH / 2);
      ctx.fill();

      // Animated dots inside bubble
      const dotCount = (Math.floor(t * 3) % 3) + 1;
      const dots = '.'.repeat(dotCount);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dots, bx, by);
      ctx.restore();
    }
  }

  function draw(timestamp) {
    const t = timestamp / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawDesks(t);

    for (const a of Object.values(agents)) {
      drawAgent(a, t);
    }
    requestAnimationFrame(draw);
  }

  function officeUpdateAgent(agent) {
    if (!agent || !agent.id) return;
    agents[agent.id] = {
      id: agent.id,
      name: agent.name || agents[agent.id]?.name || agent.id,
      role: agent.role || agents[agent.id]?.role || agent.id,
      state: agent.state || 'IDLE',
      log: agent.log || ''
    };
  }
  window.officeUpdateAgent = officeUpdateAgent;

  // Interactive Click: Click any desk on canvas to manually cycle agent state
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    for (const [id, d] of Object.entries(desks)) {
      if (cx >= d.x && cx <= d.x + DESK_W && cy >= d.y && cy <= d.y + DESK_H) {
        const ag = agents[id] || { id, name: d.label, role: id, state: 'IDLE' };
        const cycle = ['IDLE', 'THINKING', 'EXECUTING', 'DONE'];
        const nextState = cycle[(cycle.indexOf(ag.state) + 1) % cycle.length];
        ag.state = nextState;
        officeUpdateAgent(ag);

        // Also trigger DOM card sync if present
        if (window.updateAgentDOM) {
          window.updateAgentDOM(ag);
        }
        break;
      }
    }
  });

  // Connect to Server SSE
  const es = new EventSource('/api/events');
  es.addEventListener('init', e => {
    try {
      const data = JSON.parse(e.data);
      if (data.agents && Array.isArray(data.agents)) {
        data.agents.forEach(a => officeUpdateAgent(a));
      }
    } catch (_) {}
  });

  es.addEventListener('agent_update', e => {
    try {
      const a = JSON.parse(e.data);
      officeUpdateAgent(a);
    } catch (_) {}
  });

  requestAnimationFrame(draw);
})();
