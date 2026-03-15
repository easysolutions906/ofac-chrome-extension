const API_BASE = 'https://ofac-screening-production.up.railway.app';
const FREE_DAILY_LIMIT = 5;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ofac-screen',
    title: 'Screen "%s" against OFAC',
    contexts: ['selection'],
  });
});

const getTodayKey = () => {
  const now = new Date();
  return `usage_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
};

const getDailyUsage = async () => {
  const key = getTodayKey();
  const result = await chrome.storage.local.get(key);
  return result[key] || 0;
};

const incrementDailyUsage = async () => {
  const key = getTodayKey();
  const current = await getDailyUsage();
  await chrome.storage.local.set({ [key]: current + 1 });
};

const getApiKey = async () => {
  const result = await chrome.storage.local.get('apiKey');
  return result.apiKey || null;
};

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== 'ofac-screen') {
    return;
  }

  const query = (info.selectionText || '').trim();
  if (!query) {
    return;
  }

  const apiKey = await getApiKey();
  const hasKey = Boolean(apiKey);

  if (!hasKey) {
    const usage = await getDailyUsage();
    if (usage >= FREE_DAILY_LIMIT) {
      await chrome.storage.local.set({
        lastResult: {
          error: true,
          message: `Daily free limit reached (${FREE_DAILY_LIMIT}/${FREE_DAILY_LIMIT}). Add an API key for unlimited screening.`,
          query,
          timestamp: Date.now(),
        },
      });
      await chrome.action.openPopup();
      return;
    }
  }

  await chrome.storage.local.set({
    lastResult: {
      loading: true,
      query,
      timestamp: Date.now(),
    },
  });

  try {
    await chrome.action.openPopup();
  } catch (_) {
    // openPopup may fail if popup is already open; that is fine
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (hasKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(`${API_BASE}/screen`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: query }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API returned ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (!hasKey) {
      await incrementDailyUsage();
    }

    const usage = hasKey ? null : await getDailyUsage();

    await chrome.storage.local.set({
      lastResult: {
        error: false,
        loading: false,
        query,
        data,
        usage,
        limit: FREE_DAILY_LIMIT,
        hasKey,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    await chrome.storage.local.set({
      lastResult: {
        error: true,
        message: err.message || 'Screening request failed.',
        query,
        timestamp: Date.now(),
      },
    });
  }
});
