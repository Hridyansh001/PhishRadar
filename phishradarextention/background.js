// PhishRadar Background Service Worker
// Communicates with Spring Boot backend POST /api/detect

const API_BASE = 'http://localhost:8080/api';
const SCAN_TIMEOUT_MS = 6000;

// Set of URLs the user has explicitly chosen to bypass for this session
const bypassedUrls = new Map();

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
 * Scan a URL via the backend POST /api/detect endpoint.
 */
async function scanUrl(url) {
  // Check memory cache
  const cached = scanCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const userid = await getConfiguredUserId();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    // Calls the original backend endpoint: POST /api/detect
    const response = await fetch(`${API_BASE}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url, userid: userid }),
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
    scanCache.set(url, { result, timestamp: Date.now() });
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
 */
function isDangerous(result, url) {
  if (!result || result.error) return false; // Fail open on errors
  if (shouldSkipUrl(url)) return false; // Never block trusted domains

  const score = Number(result.risckscore ?? result.riskscore ?? result.riskScore ?? 0);
  const isSuspicious = result.finalresult === 'SUSPICIOUS' || result.actiontaken === 'WARNING';
  const isReview = result.finalresult === 'REVIEW' || result.actiontaken === 'REVIEW';

  // Strict Threshold Enforcement:
  // - Below 20: Safe and clean -> goes through without blocking (return false)
  // - 20 to 60: Suspicious & requires review -> block & ask if user wants to continue (return true)
  // - Above 60: Threats & phishing -> block (return true)
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
  const BYPASS_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();
  for (const [url, timestamp] of bypassedUrls) {
    if (now - timestamp > BYPASS_TTL_MS) {
      bypassedUrls.delete(url);
    }
  }
  for (const [url, entry] of scanCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      scanCache.delete(url);
    }
  }
}

setInterval(cleanupExpired, 60 * 1000);

// ==========================================
// Navigation Interception via webNavigation & tabs
// ==========================================

const inflightScans = new Set();

function isBypassed(url) {
  if (!url) return false;
  if (bypassedUrls.has(url)) return true;
  try {
    const u = new URL(url);
    if (bypassedUrls.has(u.origin) || bypassedUrls.has(u.origin + '/') || bypassedUrls.has(u.href)) {
      return true;
    }
  } catch {}
  return false;
}

async function handleNavigation(tabId, url) {
  if (!url || !tabId) return;
  if (shouldSkipUrl(url)) return;
  if (url.startsWith(chrome.runtime.getURL('warning.html'))) return;
  if (isBypassed(url)) return;

  const enabled = await isProtectionEnabled();
  if (!enabled) return;

  const dedupeKey = `${tabId}:${url}`;
  if (inflightScans.has(dedupeKey)) return;
  inflightScans.add(dedupeKey);

  try {
    const result = await scanUrl(url);

    if (isDangerous(result, url)) {
      if (!isBypassed(url)) {
        const warningUrl = getWarningPageUrl(url, result);
        chrome.tabs.update(tabId, { url: warningUrl });
      }
    }
  } catch (err) {
    console.error('[PhishRadar] Navigation scan error:', err);
  } finally {
    setTimeout(() => inflightScans.delete(dedupeKey), 2500);
  }
}

chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0 && details.url) {
    handleNavigation(details.tabId, details.url);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleNavigation(tabId, changeInfo.url);
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
    bypassedUrls.set(message.url, Date.now());
    try {
      const u = new URL(message.url);
      bypassedUrls.set(u.origin, Date.now());
      bypassedUrls.set(u.origin + '/', Date.now());
      bypassedUrls.set(u.href, Date.now());
    } catch {}
    sendResponse({ ok: true });
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
