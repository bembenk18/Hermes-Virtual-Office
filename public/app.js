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

  const evtSource = new EventSource('/api/events');
  evtSource.addEventListener('init', e => {
    const data = JSON.parse(e.data);
    initAgents(data.agents);
  });
  evtSource.addEventListener('agent_update', e => {
    const upd = JSON.parse(e.data);
    updateAgent(upd);
  });

  function initAgents(agents) {
    agentListDiv.innerHTML = '';
    agentSelect.innerHTML = '<option value="">-- Pilih Agen</option>';
    agents.forEach(a => {
      renderAgentCard(a);
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      agentSelect.appendChild(opt);
    });
  }

  function renderAgentCard(agent) {
    const card = document.createElement('div');
    card.className = 'agent-card';
    card.id = `agent-${agent.id}`;
    card.innerHTML = `
      <div class="agent-header">
        <div class="agent-avatar" style="background:#58a6ff;">${agent.id.charAt(0).toUpperCase()}</div>
        <div class="agent-name">${agent.name}</div>
        <div class="state-badge state-${agent.state}">${agent.state}</div>
      </div>
      <div class="agent-role">${agent.role}</div>
      <div class="agent-log">${agent.log}</div>`;
    agentListDiv.appendChild(card);
  }

  function updateAgent(agent) {
    const card = document.getElementById(`agent-${agent.id}`);
    if (card) {
      const badge = card.querySelector('.state-badge');
      badge.className = `state-badge state-${agent.state}`;
      badge.textContent = agent.state;
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
