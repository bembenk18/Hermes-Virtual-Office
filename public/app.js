document.addEventListener('DOMContentLoaded', () => {
  const agentSelect = document.getElementById('agent-select');
  const agentListDiv = document.getElementById('agent-list');
  const logList = document.getElementById('log-list');

  function addLog(msg) {
    if (!logList) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    logList.appendChild(entry);
    logList.scrollTop = logList.scrollHeight;
  }

  const es = new EventSource('/api/events');
  es.addEventListener('init', e => {
    try {
      const { agents } = JSON.parse(e.data);
      initAgents(agents);
    } catch (_) {}
  });

  es.addEventListener('agent_update', e => {
    try {
      const agent = JSON.parse(e.data);
      updateAgent(agent);
      if (window.officeUpdateAgent) {
        window.officeUpdateAgent(agent);
      }
    } catch (_) {}
  });

  function initAgents(agents) {
    if (!agentSelect || !agentListDiv) return;
    agentSelect.innerHTML = '<option value="">-- Select Agent --</option>';
    agentListDiv.innerHTML = '';

    agents.forEach(agent => {
      // Add option to dropdown
      const opt = document.createElement('option');
      opt.value = agent.id;
      opt.textContent = `${agent.name} (${agent.role})`;
      agentSelect.appendChild(opt);

      // Create Sidebar Card
      const card = document.createElement('div');
      card.id = `agent-${agent.id}`;
      card.className = 'agent-card';
      card.dataset.id = agent.id;
      card.innerHTML = `
        <div class="agent-row">
          <div class="agent-icon" style="background:${getRoleColor(agent.role)};color:#fff;">
            ${agent.id.charAt(0).toUpperCase()}
          </div>
          <div>
            <div class="agent-name">${agent.name}</div>
            <div class="agent-role">${agent.role}</div>
          </div>
          <div class="state-badge state-${agent.state}">${agent.state}</div>
        </div>
        <div class="agent-log">${agent.log || 'Idle'}</div>
      `;

      // Click card to select in dropdown
      card.addEventListener('click', () => {
        document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        agentSelect.value = agent.id;
      });

      agentListDiv.appendChild(card);
    });
  }

  function getRoleColor(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('orchestrator') || r.includes('lead')) return '#3b82f6';
    if (r.includes('engineer') || r.includes('coder')) return '#22c55e';
    if (r.includes('researcher')) return '#f97316';
    if (r.includes('tester') || r.includes('qa')) return '#a855f7';
    return '#64748b';
  }

  function updateAgent(agent) {
    const card = document.getElementById(`agent-${agent.id}`);
    if (card) {
      const badge = card.querySelector('.state-badge');
      if (badge) {
        badge.className = `state-badge state-${agent.state}`;
        badge.textContent = agent.state;
      }
      const log = card.querySelector('.agent-log');
      if (log) {
        log.textContent = agent.log || agent.state;
      }
    }
    addLog(`<span class="log-name">${agent.name}</span>: ${agent.log || agent.state}`);
  }

  window.updateAgentDOM = updateAgent;

  window.clearTask = () => {
    const taskInput = document.getElementById('task-input');
    if (taskInput) taskInput.value = '';
  };

  window.dispatchTask = () => {
    const agentId = agentSelect ? agentSelect.value : '';
    const taskInput = document.getElementById('task-input');
    const task = taskInput ? taskInput.value.trim() : '';

    if (!agentId) {
      alert('Pilih agent terlebih dahulu!');
      return;
    }
    if (!task) {
      alert('Masukkan deskripsi task!');
      return;
    }

    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, task })
    });

    addLog(`Dispatched task for <b>${agentId}</b>: "${task}"`);
    if (taskInput) taskInput.value = '';
  };
});
