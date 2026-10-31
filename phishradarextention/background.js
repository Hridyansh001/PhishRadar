// PhishRadar Background Service Worker
// Communicates with Spring Boot backend POST /api/detect

const API_BASE = 'http://localhost:8080/api';
const SCAN_TIMEOUT_MS = 6000;

// Tab-specific temporary single-use bypasses (valid for 20s for the specific tab that clicked Continue)
const tabOneTimeBypasses = new Map();

// In-memory cache of recent scan results to minimize redundant requests
const scanCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Domains to skip scanning (browser internals, local development)
const SKIP_DOMAINS = new Set([
  'localhost', '127.0.0.1', 'chrome.google.com', 'chromewebstore.google.com',
  'chrome-extension', 'about', 'chrome', 'edge', 'brave', 'newtab',
  'extensions', 'settings', 'devtools'
]);

// Trusted major domains - prevent false positives on common legitimate platforms
const TRUSTED_DOMAINS = new Set([
  'google.com', 'youtube.com', 'github.com', 'microsoft.com', 'apple.com',
  'wikipedia.org', 'amazon.com', 'twitter.com', 'x.com', 'facebook.com',
  'instagram.com', 'linkedin.com', 'reddit.com', 'netflix.com', 'yahoo.com',
  'bing.com', 'duckduckgo.com', 'cloudflare.com', 'stackoverflow.com',
  'npmjs.com', 'brave.com', 'mozilla.org'
]);

const SKIP_PROTOCOLS = new Set([
  'chrome:', 'chrome-extension:', 'about:', 'edge:', 'brave:', 'data:', 'blob:', 'file:', 'javascript:'
]);

/**
 * Check if real-time protection is toggled on.
 * Active by default out-of-the-box.
 */
async function isProtectionEnabled() {
  const data = await chrome.storage.local.get(['protectionEnabled']);
  return data.protectionEnabled !== false; // Default: ON (active out of the box)
}

/**
 * Get configured user ID for backend detection endpoint.
 */
async function getConfiguredUserId() {
  const data = await chrome.storage.local.get(['phishradar_user', 'userId']);
  if (data.phishradar_user && data.phishradar_user.userid) {
    return parseInt(data.phishradar_user.userid, 10);
  }
  return data.userId ? parseInt(data.userId, 10) : 1;
}

/**
 * Extract root domain (e.g. "www.google.com" -> "google.com")
 */
function getRootDomain(hostname) {
  if (!hostname) return '';
  const parts = hostname.toLowerCase().split('.');
  if (parts.length >= 2) {
    return parts.slice(-2).join('.');
  }
  return hostname.toLowerCase();
}

/**
 * Check if a URL should be skipped from auto-blocking.
 */
function shouldSkipUrl(url) {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    if (SKIP_PROTOCOLS.has(parsed.protocol)) return true;
    if (SKIP_DOMAINS.has(parsed.hostname)) return true;

    // Check trusted domains
    const rootDomain = getRootDomain(parsed.hostname);
    if (TRUSTED_DOMAINS.has(rootDomain) || TRUSTED_DOMAINS.has(parsed.hostname)) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Scan a URL via the backend POST /api/detect endpoint with optional DOM telemetry.
 */
async function scanUrl(url, domFeatures = null) {
  const cacheKey = domFeatures ? `${url}#hasDOM` : url;
  // Check memory cache
  const cached = scanCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const userid = await getConfiguredUserId();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    const payload = {
      url: url,
      userid: userid
    };
    if (domFeatures) {
      payload.domFeatures = domFeatures;
    }

    // Calls the backend endpoint: POST /api/detect
    const response = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        error: true,
        status: response.status,
        message: errorBody.error || `Backend returned HTTP ${response.status}`,
      };
    }

    const result = await response.json();
    scanCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { error: true, message: 'Scan request timed out' };
    }
    return { error: true, message: 'Backend unavailable: ' + err.message };
  }
}

/**
 * Determine if a scan result warrants blocking the user.
 * Tiers:
 *   score < 20  → SAFE   → let through (return false)
 *   20 ≤ score < 60 → SUSPICIOUS → block + review prompt (return true)
 *   score ≥ 60  → HIGH RISK → block hard (return true)
 */
function isDangerous(result, url) {
  if (!result || result.error) return false; // Fail open on backend errors
  if (shouldSkipUrl(url)) return false;      // Never block trusted / internal URLs

  const score = Number(
    result.risckscore ?? result.riskscore ?? result.riskScore ?? 0
  );
  const isSuspicious = result.finalresult === 'SUSPICIOUS' || result.actiontaken === 'WARNING';
  const isReview = result.finalresult === 'REVIEW' || result.actiontaken === 'REVIEW';

  // Only block when score is in the suspicious/dangerous range OR backend flags it
  if (score >= 20 || isSuspicious || isReview) {
    return true;
  }

  return false;
}

/**
 * Build warning interstitial page URL with telemetry parameters.
 */
function getWarningPageUrl(originalUrl, scanResult) {
  const params = new URLSearchParams();
  params.set('url', originalUrl);
  if (scanResult) {
    params.set('finalresult', scanResult.finalresult || 'SUSPICIOUS');
    params.set('risckscore', String(scanResult.risckscore ?? ''));
    params.set('risklevel', scanResult.risklevel || 'HIGH');
    params.set('message', scanResult.message || '');
    params.set('domain', scanResult.domain || '');
    params.set('findings', JSON.stringify(scanResult.findings || []));
    params.set('explanations', JSON.stringify(scanResult.explanations || scanResult.intelligenceReasons || []));
    params.set('mlresult', scanResult.mlresult || '');
    params.set('regexresult', scanResult.regexresult || '');
    params.set('actiontaken', scanResult.actiontaken || 'WARNING');
  }
  return chrome.runtime.getURL('warning.html') + '?' + params.toString();
}

/**
 * Clean up expired bypass entries periodically.
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [tabId, entry] of tabOneTimeBypasses) {
    if (now >= entry.expiresAt) {
      tabOneTimeBypasses.delete(tabId);
    }
  }
  for (const [url, entry] of scanCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      scanCache.delete(url);
    }
  }
}

setInterval(cleanupExpired, 10 * 1000);

// ==========================================
// Navigation Interception via webNavigation, tabs & content
// ==========================================

const inflightScans = new Set();

function normalizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    return `${u.protocol}//${u.hostname}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

function isBypassed(url, tabId) {
  if (!url) return false;
  const now = Date.now();
  const norm = normalizeUrl(url);

  // Tab-scoped one-time bypass (from clicking "Continue Anyway" on the warning interstitial)
  if (tabId && tabOneTimeBypasses.has(tabId)) {
    const entry = tabOneTimeBypasses.get(tabId);
    if (now < entry.expiresAt) {
      if (normalizeUrl(entry.url) === norm) {
        return true;
      }
    } else {
      tabOneTimeBypasses.delete(tabId);
    }
  }

  return false;
}

async function handleNavigation(tabId, url) {
  if (!url || !tabId) return;
  if (shouldSkipUrl(url)) return;
  if (url.startsWith(chrome.runtime.getURL('warning.html'))) return;
  if (isBypassed(url, tabId)) return;

  const enabled = await isProtectionEnabled();
  if (!enabled) return;

  const norm = normalizeUrl(url);
  const dedupeKey = `${tabId}:${norm}`;
  if (inflightScans.has(dedupeKey)) return;
  inflightScans.add(dedupeKey);

  try {
    const result = await scanUrl(url);

    if (isDangerous(result, url)) {
      if (!isBypassed(url, tabId)) {
        const warningUrl = getWarningPageUrl(url, result);
        chrome.tabs.update(tabId, { url: warningUrl });
      }
    }
  } catch (err) {
    console.error('[PhishRadar] Navigation scan error:', err);
  } finally {
    // Delete immediately on completion so future attempts to the same site are never blocked by stale keys
    inflightScans.delete(dedupeKey);
  }
}

// 1. Navigation starts (catches manual address bar typing & initial link clicks)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.url && (details.frameId === 0 || details.frameType === 'outermost_frame' || details.frameType === 'prerender')) {
    handleNavigation(details.tabId, details.url);
  }
});

// 2. Navigation committed (catches autofill-and-enter, prerender activation, and redirects)
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.url && (details.frameId === 0 || details.frameType === 'outermost_frame')) {
    handleNavigation(details.tabId, details.url);
  }
});

// 3. In-page & SPA history navigation (catches link clicks in modern web applications)
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.url && (details.frameId === 0 || details.frameType === 'outermost_frame')) {
    handleNavigation(details.tabId, details.url);
  }
});

// 4. Tab URL updates (catches link clicks in existing or new tabs where changeInfo.url or tab.url updates)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const targetUrl = changeInfo.url || (changeInfo.status === 'loading' && tab && tab.url ? tab.url : null);
  if (targetUrl) {
    handleNavigation(tabId, targetUrl);
  }
});

/**
 * Helper to open or focus a PhishRadar frontend tab.
 */
async function openOrFocusTab(targetUrl) {
  try {
    const tabs = await chrome.tabs.query({});
    const existing = tabs.find(t => {
      try {
        const u = new URL(t.url);
        return (u.hostname === 'localhost' || u.hostname === '127.0.0.1') && (u.port === '5173' || u.port === '3000');
      } catch {
        return false;
      }
    });

    if (existing && existing.id) {
      await chrome.tabs.update(existing.id, { url: targetUrl, active: true });
      if (existing.windowId) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
      return existing;
    }
  } catch {
    // Fall back to creating a new tab
  }
  return chrome.tabs.create({ url: targetUrl });
}

/**
 * Actively inspect open dashboard tabs to retrieve logged in user session.
 */
async function checkTabsForAuth() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.url || !tab.id) continue;
      try {
        const u = new URL(tab.url);
        if ((u.hostname === 'localhost' || u.hostname === '127.0.0.1') && (u.port === '5173' || u.port === '3000')) {
          if (chrome.scripting) {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                try {
                  const raw = localStorage.getItem('phishradar_user');
                  return raw ? JSON.parse(raw) : null;
                } catch {
                  return null;
                }
              }
            });
            if (results && results[0] && results[0].result) {
              const user = results[0].result;
              await chrome.storage.local.set({ phishradar_user: user, userId: user.userid });
              return user;
            }
          }
        }
      } catch {
        // Ignore single tab errors
      }
    }
  } catch {
    // Ignore query errors
  }
  return null;
}

// ==========================================
// Message Handling (from popup, content & warning)
// ==========================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_URL') {
    scanUrl(message.url).then(result => {
      sendResponse(result);
    }).catch(err => {
      sendResponse({ error: true, message: err.message });
    });
    return true; // async
  }

  if (message.type === 'BYPASS_URL') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && message.url) {
      tabOneTimeBypasses.set(tabId, {
        url: message.url,
        expiresAt: Date.now() + 20000 // 20-second window strictly for this tab
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'GO_BACK_TO_SAFETY') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId) {
      tabOneTimeBypasses.delete(tabId);
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0 && tabs[0].id) {
        tabOneTimeBypasses.delete(tabs[0].id);
        chrome.tabs.update(tabs[0].id, { url: 'chrome://newtab/' });
      }
    });
    sendResponse({ ok: true });
    return true;
  }

  // Pre-scan when user clicks an external link on any webpage
  if (message.type === 'LINK_CLICKED') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && message.url) {
      handleNavigation(tabId, message.url);
    }
    return false;
  }

  // Real-time verification when a page loads (catches autofill prerenders, fast link clicks & DOM telemetry)
  if (message.type === 'VERIFY_PAGE_LOAD') {
    const tabId = sender.tab ? sender.tab.id : null;
    const url = message.url;
    const domFeatures = message.domFeatures || null;
    if (!url || shouldSkipUrl(url) || isBypassed(url, tabId)) {
      sendResponse({ isDangerous: false });
      return true;
    }
    isProtectionEnabled().then(async (enabled) => {
      if (!enabled) {
        sendResponse({ isDangerous: false });
        return;
      }
      try {
        const result = await scanUrl(url, domFeatures);
        if (isDangerous(result, url) && !isBypassed(url, tabId)) {
          const warningUrl = getWarningPageUrl(url, result);
          sendResponse({ isDangerous: true, warningUrl });
        } else {
          sendResponse({ isDangerous: false });
        }
      } catch {
        sendResponse({ isDangerous: false });
      }
    });
    return true;
  }

  if (message.type === 'GET_PROTECTION_STATUS') {
    isProtectionEnabled().then(enabled => {
      sendResponse({ enabled });
    });
    return true;
  }

  // Auth synchronization from content script or popup
  if (message.type === 'SYNC_USER_FROM_PAGE') {
    if (message.user) {
      chrome.storage.local.set({
        phishradar_user: message.user,
        userId: message.user.userid
      }).then(() => {
        sendResponse({ ok: true, user: message.user });
      });
    } else {
      chrome.storage.local.remove(['phishradar_user', 'userId']).then(() => {
        sendResponse({ ok: true, user: null });
      });
    }
    return true;
  }

  if (message.type === 'GET_AUTH_STATE') {
    chrome.storage.local.get(['phishradar_user', 'userId']).then(data => {
      sendResponse({
        isAuthenticated: !!data.phishradar_user,
        user: data.phishradar_user || null,
        userId: data.userId || null
      });
    });
    return true;
  }

  if (message.type === 'LOGOUT_USER') {
    chrome.storage.local.remove(['phishradar_user', 'userId']).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'CHECK_OPEN_TABS_AUTH') {
    checkTabsForAuth().then(user => {
      sendResponse({ user, isAuthenticated: !!user });
    });
    return true;
  }

  // Navigation redirects to frontend web dashboard
  if (message.type === 'OPEN_DASHBOARD_LOGIN') {
    openOrFocusTab('http://localhost:5173/login?source=extension').then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'OPEN_DASHBOARD_SIGNUP') {
    openOrFocusTab('http://localhost:5173/signup?source=extension').then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'OPEN_DASHBOARD') {
    openOrFocusTab('http://localhost:5173/dashboard').then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }
});

// Initialize default settings on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Only set protection toggle preference; user must login before protection activates
    chrome.storage.local.set({ protectionEnabled: true });
  }
});
