// Status panel — subscribes to forge events and updates DOM fields

const fields = {
  project: document.getElementById('status-project'),
  mode: document.getElementById('status-mode'),
  phase: document.getElementById('status-phase'),
  elapsed: document.getElementById('status-elapsed'),
  agents: document.getElementById('status-agents'),
  decisions: document.getElementById('status-decisions'),
  artifacts: document.getElementById('status-artifacts'),
  warnings: document.getElementById('status-warnings'),
};

let activeAgents = 0;
let totalDecisions = 0;
let totalArtifacts = 0;
let totalWarnings = 0;
let elapsedTimer = null;
let startTime = null;

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startElapsedTimer() {
  startTime = Date.now();
  elapsedTimer = setInterval(() => {
    fields.elapsed.textContent = formatElapsed(Date.now() - startTime);
  }, 1000);
}

function handleForgeEvent(data) {
  switch (data.type) {
    case 'mode:change':
      fields.mode.textContent = data.mode;
      break;

    case 'stage:change':
      fields.phase.textContent = data.stage;
      break;

    case 'agent:spawn':
      activeAgents++;
      fields.agents.textContent = String(activeAgents);
      break;

    case 'agent:done':
      activeAgents = Math.max(0, activeAgents - 1);
      fields.agents.textContent = String(activeAgents);
      break;

    case 'decision:lock':
      totalDecisions++;
      fields.decisions.textContent = String(totalDecisions);
      break;

    case 'artifact:create':
      totalArtifacts++;
      fields.artifacts.textContent = String(totalArtifacts);
      break;

    case 'warning':
      totalWarnings++;
      fields.warnings.textContent = String(totalWarnings);
      break;
  }
}

// Listen for forge events from main process
window.forgeAPI.onForgeEvent(handleForgeEvent);

// Listen for Claude spawn to start timer and set project name
window.forgeAPI.onClaudeExit((data) => {
  if (elapsedTimer) {
    clearInterval(elapsedTimer);
  }
  if (data.code === 0) {
    fields.mode.textContent = 'complete';
    fields.mode.style.color = 'var(--green-bright)';
  } else {
    fields.mode.textContent = 'error';
    fields.mode.style.color = 'var(--red-error)';
  }
});

// Set project name from launch input and start timer when Claude spawns
const promptInput = document.getElementById('prompt-input');
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', () => {
  const prompt = promptInput.value.trim();
  if (prompt) {
    // Use first 30 chars of prompt as project name
    fields.project.textContent = prompt.length > 30
      ? prompt.slice(0, 30) + '...'
      : prompt;
    startElapsedTimer();
  }
});
