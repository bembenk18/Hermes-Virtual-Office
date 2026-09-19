// App Logic: SSE Integration, Agent Cards, Transcript Modal, Sidebar Log Filtering

document.addEventListener('DOMContentLoaded', () => {
  const agentSelect = document.getElementById('agent-select');
  const agentListDiv = document.getElementById('agent-list');
  const logList = document.getElementById('log-list');
  const logFilterAgent = document.getElementById('log-filter-agent');

  let allAgents = [];
  let globalLogs = []; // Array of log items across system
  let currentModalAgentId = null;
  let isErrorFilterActive = false;

  // Sound & Selection Hooks
  window.selectAgentInUI = (agentId) => {
    if (agentSelect) agentSelect.value = agentId;
    document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`agent-${agentId}`);
    if (card) card.classList.add('selected');
  };

  // SSE Event Handling
  const es = new EventSource('/api/events');
  es.addEventListener('init', e => {
    try {
      const data = JSON.parse(e.data);
      allAgents = data.agents || [];
      initAgentsUI(allAgents);
      if (window.officeUpdateAgent) {
        allAgents.forEach(a => window.officeUpdateAgent(a));
      }
    } catch (_) {}
  });

  es.addEventListener('agent_update', e => {
    try {
      const agent = JSON.parse(e.data);
      updateAgentUI(agent);
      if (window.officeUpdateAgent) window.officeUpdateAgent(agent);
    } catch (_) {}
  });

  function getRoleColor(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('orchestrator') || r.includes('lead')) return '#3b82f6';
    if (r.includes('engineer') || r.includes('coder') || r.includes('dev')) return '#22c55e';
    if (r.includes('researcher') || r.includes('scout')) return '#f97316';
    if (r.includes('tester') || r.includes('qa')) return '#a855f7';
    return '#64748b';
  }

  function initAgentsUI(agents) {
    if (!agentSelect || !agentListDiv) return;
    agentSelect.innerHTML = '<option value="">-- Select Agent --</option>';
    if (logFilterAgent) {
      logFilterAgent.innerHTML = '<option value="ALL">All Agents</option>';
    }
    agentListDiv.innerHTML = '';

    agents.forEach(agent => {
      // Dropdown option
      const opt = document.createElement('option');
      opt.value = agent.id;
      opt.textContent = `${agent.name} · ${agent.role}`;
      agentSelect.appendChild(opt);

      // Filter dropdown option
      if (logFilterAgent) {
        const filterOpt = document.createElement('option');
        filterOpt.value = agent.id;
        filterOpt.textContent = agent.name;
        logFilterAgent.appendChild(filterOpt);
      }

      addAgentCard(agent);

      // Sync logHistory to globalLogs
      if (agent.logHistory) {
        agent.logHistory.forEach(lh => {
          globalLogs.push({ agentId: agent.id, agentName: agent.name, ...lh });
        });
      }
    });

    renderSidebarLogs();
  }

  function addAgentCard(agent) {
    let card = document.getElementById(`agent-${agent.id}`);
    if (!card) {
      card = document.createElement('div');
      card.id = `agent-${agent.id}`;
      card.className = 'agent-card';
      agentListDiv.appendChild(card);
    }

    card.dataset.id = agent.id;
    const skillsText = agent.skills && agent.skills.length > 0 ? `Skills: ${agent.skills.join(', ')}` : '';

    card.innerHTML = `
      <div class="agent-row">
        <div class="agent-icon" style="background:${getRoleColor(agent.role)};color:#fff">
          ${agent.id.charAt(0).toUpperCase()}
        </div>
        <div>
          <div class="agent-name">${agent.name}</div>
          <div class="agent-role">${agent.role}</div>
        </div>
        <div class="state-badge state-${agent.state}">${agent.state}</div>
      </div>
      ${skillsText ? `<div class="agent-skills">${skillsText}</div>` : ''}
      <div class="agent-log">${agent.log || 'Idle'}</div>
    `;

    // Click agent card -> Open Agent Transcript Log Modal
    card.onclick = () => {
      window.selectAgentInUI(agent.id);
      openTranscriptModal(agent.id);
    };
  }

  function updateAgentUI(agent) {
    const idx = allAgents.findIndex(a => a.id === agent.id);
    if (idx >= 0) allAgents[idx] = agent;
    else allAgents.push(agent);

    addAgentCard(agent);

    // Record new log entry to globalLogs
    const isErr = agent.state === 'IDLE' && (agent.log || '').toLowerCase().includes('fail');
    const logItem = {
      agentId: agent.id,
      agentName: agent.name,
      time: new Date().toLocaleTimeString(),
      text: agent.log || agent.state,
      isError: isErr
    };
    globalLogs.push(logItem);
    renderSidebarLogs();

    // If modal is open for this agent, update live transcript in modal
    if (currentModalAgentId === agent.id) {
      renderModalTranscript(agent);
    }
  }

  // Sidebar Log Filtering
  window.toggleErrorFilter = () => {
    isErrorFilterActive = !isErrorFilterActive;
    const btn = document.getElementById('filter-err-toggle');
    if (btn) {
      btn.classList.toggle('active', isErrorFilterActive);
    }
    renderSidebarLogs();
  };

  window.renderLogs = () => {
    renderSidebarLogs();
  };

  function renderSidebarLogs() {
    if (!logList) return;
    const selectedFilter = logFilterAgent ? logFilterAgent.value : 'ALL';

    const filtered = globalLogs.filter(item => {
      const matchAgent = selectedFilter === 'ALL' || item.agentId === selectedFilter;
      const matchError = !isErrorFilterActive || item.isError || (item.text || '').includes('[ERROR]') || (item.text || '').toLowerCase().includes('failed');
      return matchAgent && matchError;
    });

    logList.innerHTML = '';
    filtered.slice(-50).forEach(item => {
      const entry = document.createElement('div');
      entry.className = `log-entry ${item.isError ? 'is-error' : ''}`;
      entry.innerHTML = `<span class="log-time">[${item.time}]</span> <span class="log-name">${item.agentName}</span>: ${escapeHtml(item.text)}`;
      logList.appendChild(entry);
    });
    logList.scrollTop = logList.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Modal: Agent Transcript Log
  function openTranscriptModal(agentId) {
    currentModalAgentId = agentId;
    const agent = allAgents.find(a => a.id === agentId);
    if (!agent) return;

    document.getElementById('modal-agent-name').textContent = `${agent.name} (${agent.id})`;
    document.getElementById('modal-agent-role').textContent = `Role: ${agent.role}`;
    renderModalTranscript(agent);

    const modal = document.getElementById('transcript-modal');
    if (modal) modal.classList.add('active');
  }

  function renderModalTranscript(agent) {
    const container = document.getElementById('transcript-container');
    if (!container) return;

    container.innerHTML = '';
    const logs = agent.logHistory || [];

    if (logs.length === 0) {
      container.innerHTML = '<div class="transcript-line sys">No transcript log recorded yet.</div>';
      return;
    }

    logs.forEach(l => {
      const line = document.createElement('div');
      const isErr = l.isError || (l.text || '').includes('[ERROR]');
      const isSys = (l.text || '').startsWith('[System]') || (l.text || '').startsWith('[Attempt]');
      line.className = `transcript-line ${isErr ? 'err' : isSys ? 'sys' : ''}`;
      line.textContent = `[${l.time || 'LOG'}] ${l.text}`;
      container.appendChild(line);
    });

    container.scrollTop = container.scrollHeight;
  }

  window.closeTranscriptModal = () => {
    currentModalAgentId = null;
    const modal = document.getElementById('transcript-modal');
    if (modal) modal.classList.remove('active');
  };

  window.clearCurrentAgentLogs = () => {
    if (!currentModalAgentId) return;
    const agent = allAgents.find(a => a.id === currentModalAgentId);
    if (agent) {
      agent.logHistory = [];
      renderModalTranscript(agent);
    }
  };

  // Form Management
  window.toggleAgentForm = () => {
    const panel = document.getElementById('agent-form-panel');
    if (!panel) return;
    if (panel.classList.contains('active')) {
      panel.classList.remove('active');
    } else {
      // Fill form from currently selected agent if available
      const selId = agentSelect ? agentSelect.value : '';
      const current = allAgents.find(a => a.id === selId);
      if (current) {
        document.getElementById('form-agent-id').value = current.id;
        document.getElementById('form-agent-name').value = current.name;
        document.getElementById('form-agent-role').value = current.role;
        document.getElementById('form-agent-skills').value = current.skills ? current.skills.join(', ') : '';
      } else {
        document.getElementById('form-agent-id').value = '';
        document.getElementById('form-agent-name').value = '';
        document.getElementById('form-agent-role').value = '';
        document.getElementById('form-agent-skills').value = '';
      }
      panel.classList.add('active');
    }
  };

  window.saveAgent = async () => {
    const id = document.getElementById('form-agent-id').value.trim().replace(/\s+/g, '-').toLowerCase();
    const name = document.getElementById('form-agent-name').value.trim();
    const role = document.getElementById('form-agent-role').value.trim();
    const skillsRaw = document.getElementById('form-agent-skills').value.trim();
    const skills = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (!id || !name) {
      alert('Agent ID and Name are required!');
      return;
    }

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, role: role || 'SubAgent', skills })
      });
      const data = await res.json();

      if (res.ok && data.agents) {
        initAgentsUI(data.agents);
        window.toggleAgentForm();
      } else {
        alert(data.error || 'Failed to save agent');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  window.clearTask = () => {
    const ti = document.getElementById('task-input');
    if (ti) ti.value = '';
  };

  window.dispatchTask = () => {
    const agentId = agentSelect ? agentSelect.value : '';
    const taskInput = document.getElementById('task-input');
    const task = taskInput ? taskInput.value.trim() : '';

    if (!agentId) { alert('Select an agent first!'); return; }
    if (!task)    { alert('Enter task description!'); return; }

    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, task })
    });

    if (taskInput) taskInput.value = '';
  };
});
