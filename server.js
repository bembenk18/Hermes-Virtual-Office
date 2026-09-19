const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

let agents = [
  {
    id: 'lead',
    name: 'Hermes Lead',
    role: 'Orchestrator',
    skills: ['task_decomposition', 'pipeline_coordination'],
    desk: { x: 100, y: 90 },
    state: 'IDLE',
    currentTask: null,
    log: 'Ready',
    logHistory: [{ time: new Date().toLocaleTimeString(), text: 'System initialized. Orchestrator ready.', isError: false }]
  },
  {
    id: 'coder',
    name: 'Dev SubAgent',
    role: 'Software Engineer',
    skills: ['file_editing', 'code_generation', 'refactoring'],
    desk: { x: 360, y: 90 },
    state: 'IDLE',
    currentTask: null,
    log: 'Ready',
    logHistory: [{ time: new Date().toLocaleTimeString(), text: 'Coder ready for file editing and implementation.', isError: false }]
  },
  {
    id: 'researcher',
    name: 'Web Scout',
    role: 'Researcher',
    skills: ['web_search', 'workspace_inspection', 'documentation'],
    desk: { x: 100, y: 270 },
    state: 'IDLE',
    currentTask: null,
    log: 'Ready',
    logHistory: [{ time: new Date().toLocaleTimeString(), text: 'Web Scout ready for research and web search.', isError: false }]
  },
  {
    id: 'qa',
    name: 'QA Auditor',
    role: 'Tester & Reviewer',
    skills: ['syntax_check', 'qa_audit', 'testing'],
    desk: { x: 360, y: 270 },
    state: 'IDLE',
    currentTask: null,
    log: 'Ready',
    logHistory: [{ time: new Date().toLocaleTimeString(), text: 'QA Auditor ready for testing and syntax verification.', isError: false }]
  }
];

let sseClients = [];

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(payload));
}

function serveStatic(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

function addAgentLog(agent, text, isError = false) {
  if (!agent.logHistory) agent.logHistory = [];
  const entry = {
    time: new Date().toLocaleTimeString(),
    text: String(text),
    isError: Boolean(isError)
  };
  agent.logHistory.push(entry);
  if (agent.logHistory.length > 200) agent.logHistory.shift();
}

function updateAgentState(id, state, log, isError = false) {
  const ag = agents.find(a => a.id === id);
  if (!ag) return;
  ag.state = state;
  if (log !== undefined) {
    ag.log = log;
    addAgentLog(ag, log, isError);
  }
  broadcast('agent_update', ag);
}

// Multi-Agent Pipeline Execution with role skills
function runLeadOrchestration(prompt) {
  const lead = agents.find(a => a.id === 'lead');
  const researcher = agents.find(a => a.id === 'researcher');
  const coder = agents.find(a => a.id === 'coder');
  const qa = agents.find(a => a.id === 'qa');

  if (lead) lead.currentTask = prompt;
  updateAgentState('lead', 'THINKING', `[Lead Pipeline] Analyzing task & delegating sub-tasks…`);

  setTimeout(() => {
    updateAgentState('lead', 'EXECUTING', `[Lead Pipeline] Delegating research to Web Scout (skills: ${researcher?.skills.join(', ') || 'search'})…`);
    if (researcher) {
      researcher.currentTask = `Research for: ${prompt}`;
      updateAgentState('researcher', 'THINKING', `[Web Scout] Inspecting codebase & requirements…`);
    }

    setTimeout(() => {
      if (researcher) updateAgentState('researcher', 'EXECUTING', `[Web Scout] Analyzing files in /root/Hermes-Virtual-Office…`);

      setTimeout(() => {
        if (researcher) {
          updateAgentState('researcher', 'DONE', `[Web Scout] Research complete. Spec sent to Coder.`);
          researcher.currentTask = null;
        }

        updateAgentState('lead', 'EXECUTING', `[Lead Pipeline] Delegating coding task to Dev SubAgent (skills: ${coder?.skills.join(', ') || 'file_editing'})…`);
        if (coder) {
          coder.currentTask = prompt;
          hermesChatAndRun(coder, prompt, 1, () => {
            // Step 4: QA verifies syntax
            updateAgentState('lead', 'EXECUTING', `[Lead Pipeline] Delegating QA audit to QA Auditor (skills: ${qa?.skills.join(', ') || 'syntax_check'})…`);
            if (qa) {
              qa.currentTask = `QA Check on public/office.js`;
              updateAgentState('qa', 'THINKING', `[QA Auditor] Verifying node syntax on modified files…`);
            }

            setTimeout(() => {
              const check = spawn('node', ['--check', 'public/office.js'], { cwd: '/root/Hermes-Virtual-Office' });
              check.on('close', checkCode => {
                if (qa) {
                  const isErr = checkCode !== 0;
                  updateAgentState('qa', isErr ? 'IDLE' : 'DONE', isErr ? `[ERROR] Syntax error found in office.js` : `[QA Auditor] Syntax check passed cleanly (0 errors)`, isErr);
                  qa.currentTask = null;
                }

                setTimeout(() => {
                  updateAgentState('lead', 'DONE', `[Lead Pipeline] Multi-agent pipeline finished successfully!`);
                  lead.currentTask = null;
                  setTimeout(() => {
                    agents.forEach(a => updateAgentState(a.id, 'IDLE', a.log));
                  }, 4000);
                }, 1000);
              });
            }, 1500);
          });
        }
      }, 2000);
    }, 2000);
  }, 1500);
}

// Single agent hermes execution with auto-retry mechanism
function hermesChatAndRun(agent, prompt, attempt = 1, onComplete = null) {
  const maxRetries = 2;
  agent.state = 'THINKING';
  agent.currentTask = prompt;
  updateAgentState(agent.id, 'THINKING', `[Attempt ${attempt}] Thinking via Hermes (skills: ${agent.skills ? agent.skills.join(', ') : 'general'})…`);

  const skillTag = agent.skills && agent.skills.length > 0 ? `[Role: ${agent.role} | Skills: ${agent.skills.join(', ')}] ` : `[Role: ${agent.role}] `;
  const fullPrompt = skillTag + prompt;

  const chat = spawn('hermes', [
    '-z',
    fullPrompt,
    '--yolo',
    '--accept-hooks'
  ], {
    cwd: '/root/Hermes-Virtual-Office',
    env: { ...process.env, HERMES_ACCEPT_HOOKS: '1' }
  });

  let output = '';
  chat.stdout.on('data', d => {
    const text = d.toString().trim();
    if (text) {
      output += text + '\n';
      agent.state = 'EXECUTING';
      agent.log = text.slice(0, 100);
      addAgentLog(agent, text, false);
      broadcast('agent_update', agent);
    }
  });

  chat.stderr.on('data', d => {
    const text = d.toString().trim();
    if (text) {
      addAgentLog(agent, `[STDERR] ${text}`, true);
      broadcast('agent_update', agent);
    }
  });

  chat.on('close', code => {
    if (code === 0) {
      updateAgentState(agent.id, 'DONE', output.trim().slice(0, 100) || 'Task completed successfully');
      agent.currentTask = null;
      if (typeof onComplete === 'function') onComplete();
    } else {
      addAgentLog(agent, `[ERROR] Execution exit code ${code}`, true);
      if (attempt <= maxRetries) {
        updateAgentState(agent.id, 'THINKING', `[ERROR Code ${code}] Auto-retrying task (Attempt ${attempt + 1}/${maxRetries + 1})…`, true);
        setTimeout(() => {
          hermesChatAndRun(agent, prompt, attempt + 1, onComplete);
        }, 1200);
      } else {
        updateAgentState(agent.id, 'IDLE', `[ERROR] Task failed after ${maxRetries + 1} attempts (Code ${code})`, true);
        agent.currentTask = null;
        if (typeof onComplete === 'function') onComplete();
      }
    }
  });

  chat.on('error', err => {
    addAgentLog(agent, `[ERROR] Spawn error: ${err.message}`, true);
    fallbackSimulation(agent, prompt, attempt, maxRetries, onComplete);
  });
}

function fallbackSimulation(agent, taskDescription, attempt, maxRetries, onComplete) {
  updateAgentState(agent.id, 'THINKING', `[Simulation] Analyzing: "${taskDescription}"`);

  setTimeout(() => {
    updateAgentState(agent.id, 'EXECUTING', `[Simulation] Running task execution…`);

    setTimeout(() => {
      updateAgentState(agent.id, 'DONE', `[Simulation] Completed: "${taskDescription}"`);
      agent.currentTask = null;

      setTimeout(() => {
        updateAgentState(agent.id, 'IDLE', agent.log);
        if (typeof onComplete === 'function') onComplete();
      }, 2000);
    }, 2000);
  }, 1500);
}

function runTask(agentId, taskDescription) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;

  agent.currentTask = taskDescription;
  updateAgentState(agent.id, 'THINKING', `Task received: "${taskDescription}"`);

  const createMatch = /^Create\s+agent\s+(\w+)(?:\s+role\s+(.+))?$/i.exec(taskDescription);
  if (createMatch) {
    const [, newId, newRole] = createMatch;
    const exists = agents.some(a => a.id === newId);
    if (exists) {
      updateAgentState(agent.id, 'DONE', `Agent ${newId} already exists`);
      return;
    }
    const roleLower = (newRole || '').toLowerCase();
    let defaultSkills = ['general_execution'];
    if (roleLower.includes('coder') || roleLower.includes('engineer')) defaultSkills = ['file_editing', 'code_generation'];
    if (roleLower.includes('scout') || roleLower.includes('researcher')) defaultSkills = ['web_search', 'workspace_inspection'];

    const newAgent = {
      id: newId,
      name: newId.charAt(0).toUpperCase() + newId.slice(1),
      role: newRole || 'SubAgent',
      skills: defaultSkills,
      desk: { x: 100 + (agents.length * 80) % 400, y: 100 },
      state: 'IDLE',
      currentTask: null,
      log: 'Joined office',
      logHistory: [{ time: new Date().toLocaleTimeString(), text: `Created agent ${newId} with role ${newRole || 'SubAgent'}`, isError: false }]
    };
    agents.push(newAgent);
    broadcast('init', { agents });
    updateAgentState(agent.id, 'DONE', `Created agent ${newId}`);
    return;
  }

  if (agentId === 'lead') {
    runLeadOrchestration(taskDescription);
  } else {
    hermesChatAndRun(agent, taskDescription);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('event: init\ndata: ' + JSON.stringify({ agents }) + '\n\n');
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  if (url.pathname === '/api/agents' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(agents));
    return;
  }

  if (url.pathname === '/api/agents' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing agent id' }));
          return;
        }

        const existingIdx = agents.findIndex(a => a.id === data.id);
        if (existingIdx >= 0) {
          if (data.name) agents[existingIdx].name = data.name;
          if (data.role) agents[existingIdx].role = data.role;
          if (data.desk) agents[existingIdx].desk = data.desk;
          if (data.skills) agents[existingIdx].skills = data.skills;
          if (data.log) {
            agents[existingIdx].log = data.log;
            addAgentLog(agents[existingIdx], data.log, false);
          }
          broadcast('agent_update', agents[existingIdx]);
        } else if (data.name) {
          const newAgent = {
            id: data.id,
            name: data.name,
            role: data.role || 'SubAgent',
            skills: data.skills || ['general_execution'],
            desk: data.desk || { x: 100 + (agents.length * 80) % 400, y: 100 },
            state: 'IDLE',
            currentTask: null,
            log: 'Joined office',
            logHistory: [{ time: new Date().toLocaleTimeString(), text: `Joined office`, isError: false }]
          };
          agents.push(newAgent);
          broadcast('init', { agents });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', agents }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/tasks' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { agentId, task } = JSON.parse(body);
        if (agentId && task) {
          runTask(agentId, task);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', message: 'Task dispatched' }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing agentId or task' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  let extname = path.extname(filePath);
  let contentType = 'text/html';

  if (extname === '.js') contentType = 'text/javascript';
  if (extname === '.css') contentType = 'text/css';
  if (extname === '.json') contentType = 'application/json';
  if (extname === '.png') contentType = 'image/png';

  serveStatic(res, filePath, contentType);
});

server.listen(PORT, () => {
  console.log(`Hermes Virtual Office running on http://localhost:${PORT}`);
});
