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
 */
async function isProtectionEnabled() {
  const data = await chrome.storage.local.get('protectionEnabled');
  return data.protectionEnabled !== false; // Default: ON
}

/**
 * Get configured user ID for backend detection endpoint (default 1).
 */
async function getConfiguredUserId() {
  const data = await chrome.storage.local.get('userId');
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

  // Check if flagged as SUSPICIOUS
  const isSuspicious = result.finalresult === 'SUSPICIOUS' || result.actiontaken === 'WARNING';
  if (!isSuspicious) return false;

  // Confirm danger with heuristic findings or elevated risk score
  const hasFindings = Array.isArray(result.findings) && result.findings.length > 0;
  const highRiskScore = (result.risckscore || 0) >= 50;

  return hasFindings || highRiskScore;
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
// Navigation Interception via webNavigation
// ==========================================

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only intercept main frame top-level navigations
  if (details.frameId !== 0) return;

  const url = details.url;
  if (shouldSkipUrl(url)) return;

  const enabled = await isProtectionEnabled();
  if (!enabled) return;

  // Check if session bypass was granted
  if (bypassedUrls.has(url)) return;

  // Skip warning page itself
  if (url.startsWith(chrome.runtime.getURL('warning.html'))) return;

  try {
    const result = await scanUrl(url);

    if (isDangerous(result, url)) {
      const warningUrl = getWarningPageUrl(url, result);
      chrome.tabs.update(details.tabId, { url: warningUrl });
    }
  } catch (err) {
    console.error('[PhishRadar] Navigation scan error:', err);
  }
});

// ==========================================
// Message Handling (from popup & warning)
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
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'GET_PROTECTION_STATUS') {
    isProtectionEnabled().then(enabled => {
      sendResponse({ enabled });
    });
    return true;
  }
});

// Initialize default settings on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ protectionEnabled: true, userId: 1 });
  }
});
