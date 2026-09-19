const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Agents State
const agents = [
  { id: 'lead', name: 'Hermes Lead', role: 'Orchestrator', desk: { x: 150, y: 150 }, state: 'IDLE', currentTask: null, log: 'Ready' },
  { id: 'coder', name: 'Dev SubAgent', role: 'Software Engineer', desk: { x: 450, y: 150 }, state: 'IDLE', currentTask: null, log: 'Ready' },
  { id: 'researcher', name: 'Web Scout', role: 'Researcher', desk: { x: 150, y: 350 }, state: 'IDLE', currentTask: null, log: 'Ready' },
  { id: 'qa', name: 'QA Auditor', role: 'Tester & Reviewer', desk: { x: 450, y: 350 }, state: 'IDLE', currentTask: null, log: 'Ready' }
];

// SSE Clients
let sseClients = [];

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(payload));
}

// Simple Static File Server
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

// Task Runner Simulation
function runTask(agentId, taskDescription) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return;

  agent.state = 'THINKING';
  agent.currentTask = taskDescription;
  agent.log = `Analyzing task: "${taskDescription}"`;
  broadcast('agent_update', agent);

  setTimeout(() => {
    agent.state = 'EXECUTING';
    agent.log = `Running step 1/2 for: "${taskDescription}"`;
    broadcast('agent_update', agent);

    setTimeout(() => {
      agent.state = 'EXECUTING';
      agent.log = `Finalizing output...`;
      broadcast('agent_update', agent);

      setTimeout(() => {
        agent.state = 'IDLE';
        agent.log = `Completed: "${taskDescription}"`;
        agent.currentTask = null;
        broadcast('agent_update', agent);
      }, 3000);
    }, 3000);
  }, 2500);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/events') {
    // Server-Sent Events stream
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`data: ${JSON.stringify({ type: 'init', agents })}\n\n`);
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

  // Serve Frontend Static Files
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
