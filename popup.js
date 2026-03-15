const CHECKOUT_URL = 'https://ofac-screening-production.up.railway.app/checkout';
const FREE_DAILY_LIMIT = 5;

const contentEl = document.getElementById('content');
const usageBar = document.getElementById('usage-bar');
const usageText = document.getElementById('usage-text');
const upgradeLink = document.getElementById('upgrade-link');
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const toggleArrow = document.getElementById('toggle-arrow');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const saveConfirm = document.getElementById('save-confirm');

const classifyScore = (score) => {
  if (score >= 95) {
    return { label: 'exact', cssClass: 'badge-exact', barClass: 'high' };
  }
  if (score >= 80) {
    return { label: 'strong', cssClass: 'badge-strong', barClass: 'high' };
  }
  if (score >= 60) {
    return { label: 'partial', cssClass: 'badge-partial', barClass: 'medium' };
  }
  return { label: 'low', cssClass: 'badge-low', barClass: 'low' };
};

const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

const renderLoading = (query) => `
  <div class="loading">
    <div class="spinner"></div>
    <div>Screening "${escapeHtml(query)}"...</div>
  </div>
`;

const renderError = (message, query) => `
  <div class="query-label">Screened Name</div>
  <div class="query-value">${escapeHtml(query)}</div>
  <div class="error-box">${escapeHtml(message)}</div>
`;

const renderMatchCard = (match) => {
  const rawScore = match.score || 0;
  const score = rawScore <= 1 ? Math.round(rawScore * 100) : Math.round(rawScore);
  const { label, cssClass, barClass } = classifyScore(score);
  const entity = match.entity || {};
  const name = entity.name || match.matchedName || match.name || 'Unknown';
  const type = entity.sdnType || match.type || '--';
  const programs = entity.programs || match.programs || [];
  const program = Array.isArray(programs) ? programs.join(', ') : (programs || '--');
  const remarks = entity.remarks || match.remarks || '';

  return `
    <div class="match-card">
      <div class="match-card-header">
        <span class="match-name">${escapeHtml(name)}</span>
        <span class="badge ${cssClass}">${label} (${score}%)</span>
      </div>
      <dl class="match-details">
        <dt>Type</dt>
        <dd>${escapeHtml(type)}</dd>
        <dt>Program</dt>
        <dd>${escapeHtml(program)}</dd>
        ${remarks ? `<dt>Remarks</dt><dd>${escapeHtml(remarks)}</dd>` : ''}
      </dl>
      <div class="score-bar">
        <div class="score-bar-fill ${barClass}" style="width: ${score}%"></div>
      </div>
    </div>
  `;
};

const renderResults = (result) => {
  const { query, data } = result;
  const matches = data.matches || data.results || [];
  const matchCount = matches.length;

  let html = `
    <div class="query-label">Screened Name</div>
    <div class="query-value">${escapeHtml(query)}</div>
  `;

  if (matchCount === 0) {
    html += '<div class="result-clear">No matches found -- Name is clear.</div>';
  } else {
    const plural = matchCount === 1 ? 'match' : 'matches';
    html += `<div class="result-alert"><span class="count">${matchCount}</span>${plural} found on the SDN list</div>`;
    html += matches.map(renderMatchCard).join('');
  }

  return html;
};

const renderEmpty = () => `
  <div class="empty-state">
    <p>Select any text on a webpage, then right-click and choose "Screen against OFAC".</p>
    <p class="hint">Results will appear here.</p>
  </div>
`;

const updateUsageBar = (result) => {
  if (!result || result.loading || result.error) {
    usageBar.style.display = 'none';
    return;
  }

  usageBar.style.display = 'flex';

  if (result.hasKey) {
    usageText.textContent = 'Unlimited (Pro)';
    upgradeLink.style.display = 'none';
  } else {
    const used = result.usage || 0;
    usageText.textContent = `${used}/${FREE_DAILY_LIMIT} free screens today`;
    upgradeLink.style.display = 'inline';
    upgradeLink.href = CHECKOUT_URL;
    upgradeLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: CHECKOUT_URL });
    });
  }
};

const render = async () => {
  const { lastResult } = await chrome.storage.local.get('lastResult');

  if (!lastResult) {
    contentEl.innerHTML = renderEmpty();
    usageBar.style.display = 'none';
    return;
  }

  if (lastResult.loading) {
    contentEl.innerHTML = renderLoading(lastResult.query);
    usageBar.style.display = 'none';
    return;
  }

  if (lastResult.error) {
    contentEl.innerHTML = renderError(lastResult.message, lastResult.query);
    usageBar.style.display = 'none';
    return;
  }

  contentEl.innerHTML = renderResults(lastResult);
  updateUsageBar(lastResult);
};

// Poll for updates when loading
const pollForUpdates = () => {
  const interval = setInterval(async () => {
    const { lastResult } = await chrome.storage.local.get('lastResult');
    if (!lastResult || !lastResult.loading) {
      clearInterval(interval);
      render();
    }
  }, 300);
};

// Settings toggle
settingsToggle.addEventListener('click', () => {
  const isOpen = settingsPanel.classList.toggle('open');
  toggleArrow.innerHTML = isOpen ? '&#9650;' : '&#9660;';
});

// Save API key
saveKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    await chrome.storage.local.set({ apiKey: key });
  } else {
    await chrome.storage.local.remove('apiKey');
  }
  saveConfirm.style.display = 'block';
  setTimeout(() => {
    saveConfirm.style.display = 'none';
  }, 2000);
});

// Load saved key
const loadSettings = async () => {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
};

// Init
render().then(() => {
  chrome.storage.local.get('lastResult').then(({ lastResult }) => {
    if (lastResult && lastResult.loading) {
      pollForUpdates();
    }
  });
});
loadSettings();
