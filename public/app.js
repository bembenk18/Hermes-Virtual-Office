document.addEventListener('DOMContentLoaded', () => {
  const agentSelect = document.getElementById('agent-select');
  const agentListDiv = document.getElementById('agent-list');
  const logList = document.getElementById('log-list');

  function addLog(msg) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = msg;
    logList.appendChild(entry);
    logList.scrollTop = logList.scrollHeight;
  }

  const es = new EventSource('/api/events');
  es.onmessage = e => {
    const data = JSON.parse(e.data);
    if (data.type === 'init') initAgents(data.agents);
    else if (data.type === 'agent_update') updateAgent(data);
  };

  function initAgents(agents) {
    agentSelect.innerHTML = '<option value="">-- Pilih Agen</option>';
    agentListDiv.innerHTML = '';
    agents.forEach(agent => {
      // dropdown
      const opt = document.createElement('option');
      opt.value = agent.id;
      opt.textContent = agent.name;
      agentSelect.appendChild(opt);
      // card simple
      const card = document.createElement('div');
      card.id = `agent-${agent.id}`;
      card.className = 'agent-card';
      card.innerHTML = `
        <div class="agent-header">
          <div class="agent-avatar" style="background:#58a6ff;">${agent.id.charAt(0).toUpperCase()}</div>
          <div class="agent-name">${agent.name}</div>
          <div class="state-badge state-${agent.state}">${agent.state}</div>
        </div>
        <div class="agent-role">${agent.role}</div>
        <div class="agent-log">${agent.log}</div>`;
      agentListDiv.appendChild(card);
    });
  }

  function updateAgent(agent) {
    const card = document.getElementById(`agent-${agent.id}`);
    if (card) {
      card.querySelector('.state-badge').className = `state-badge state-${agent.state}`;
      card.querySelector('.state-badge').textContent = agent.state;
      card.querySelector('.agent-log').textContent = agent.log;
    }
    addLog(`Agent ${agent.name} ${agent.state}`);
  }

  window.dispatchTask = () => {
    const agentId = agentSelect.value;
    const task = document.getElementById('task-input').value.trim();
    if (!agentId || !task) return;
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, task })
    });
    addLog(`Dispatched "${task}" to ${agentId}`);
  };
});
