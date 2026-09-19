document.addEventListener('DOMContentLoaded', () => {
  const agentSelect = document.getElementById('agent-select');
  const agentListDiv = document.getElementById('agent-list');
  const logList = document.getElementById('log-list');

  function addLog(msg) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${msg}`;
    logList.appendChild(entry);
    logList.scrollTop = logList.scrollHeight;
  }

  const es = new EventSource('/api/events');
  es.addEventListener('init', e => {
    const { agents } = JSON.parse(e.data);
    initAgents(agents);
  });
  es.addEventListener('agent_update', e => {
    updateAgent(JSON.parse(e.data));
  });

  function initAgents(agents) {
    agentSelect.innerHTML = '<option value="">-- Select Agent --</option>';
    agentListDiv.innerHTML = '';
    agents.forEach(agent => {
      const opt = document.createElement('option');
      opt.value = agent.id;
      opt.textContent = agent.name;
      agentSelect.appendChild(opt);

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
      const badge = card.querySelector('.state-badge');
      if (badge) {
        badge.className = `state-badge state-${agent.state}`;
        badge.textContent = agent.state;
      }
      const log = card.querySelector('.agent-log');
      if (log) {
        log.textContent = agent.log;
      }
    }
    addLog(`${agent.name}: ${agent.log}`);
  }

  window.dispatchTask = () => {
    const agentId = agentSelect.value;
    const taskInput = document.getElementById('task-input');
    const task = taskInput ? taskInput.value.trim() : '';
    if (!agentId || !task) return;
    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, task })
    });
    if (taskInput) taskInput.value = '';
  };
});
