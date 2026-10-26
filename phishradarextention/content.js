// PhishRadar Content Script
// Bridges authentication and telemetry between the web dashboard and extension

(function () {
  'use strict';

  // Do not run on internal extension pages
  if (window.location.protocol === 'chrome-extension:' || window.location.protocol === 'chrome:') {
    return;
  }

  // Indicate to the webpage that PhishRadar extension is installed and active
  try {
    document.documentElement.setAttribute('data-phishradar-extension-active', 'true');
  } catch {
    // Ignore DOM restriction errors
  }

  let lastSyncedUserJson = null;

  function isPhishRadarPage() {
    const origin = window.location.origin || '';
    const host = window.location.hostname || '';
    return (
      origin.includes('localhost:5173') ||
      origin.includes('127.0.0.1:5173') ||
      origin.includes('localhost:3000') ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      document.title.toLowerCase().includes('phishradar') ||
      document.documentElement.hasAttribute('data-phishradar-extension-active')
    );
  }

  function syncAuth(user) {
    // NEVER wipe user from extension storage if we are on an arbitrary website!
    if (!user && !isPhishRadarPage()) {
      return;
    }

    const currentJson = JSON.stringify(user || null);
    if (currentJson === lastSyncedUserJson) return;
    lastSyncedUserJson = currentJson;

    // 1. Directly write to chrome.storage.local from content script
    try {
      if (chrome.storage && chrome.storage.local) {
        if (user) {
          chrome.storage.local.set({
            phishradar_user: user,
            userId: user.userid
          });
        } else if (isPhishRadarPage()) {
          chrome.storage.local.remove(['phishradar_user', 'userId']);
        }
      }
    } catch {
      // Storage access might be restricted
    }

    // 2. Relay message to background service worker
    try {
      chrome.runtime.sendMessage({
        type: 'SYNC_USER_FROM_PAGE',
        user: user || null
      }).catch(() => {
        // Background worker may be inactive
      });
    } catch {
      // Ignore runtime errors
    }
  }

  function checkAndSyncAuth() {
    // Only inspect auth state on PhishRadar web pages
    if (!isPhishRadarPage()) {
      return null;
    }

    try {
      const stored = window.localStorage.getItem('phishradar_user');
      if (stored) {
        const user = JSON.parse(stored);
        syncAuth(user);
        return user;
      }

      const attr = document.documentElement.getAttribute('data-phishradar-user');
      if (attr) {
        const user = JSON.parse(attr);
        syncAuth(user);
        return user;
      }

      // If on PhishRadar web page and neither is present, user is logged out on the dashboard
      syncAuth(null);
    } catch {
      // Ignore parse errors
    }
    return null;
  }

  // Initial sync immediately
  checkAndSyncAuth();

  // Re-check after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndSyncAuth);
  }
  window.addEventListener('load', checkAndSyncAuth);

  // Periodic heartbeat sync (every 1.5s) to guarantee session pickup
  setInterval(checkAndSyncAuth, 1500);

  // Listen for broadcast messages from PhishRadar web application
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PHISHRADAR_AUTH_SYNC') {
      syncAuth(event.data.user || null);
    }
  });

  // Listen for custom auth events from PhishRadar
  window.addEventListener('phishradar-auth-sync', (event) => {
    if (event.detail && 'user' in event.detail) {
      syncAuth(event.detail.user || null);
    }
  });

  // Listen for storage changes across tabs
  window.addEventListener('storage', (event) => {
    if (event.key === 'phishradar_user') {
      try {
        const user = event.newValue ? JSON.parse(event.newValue) : null;
        syncAuth(user);
      } catch {
        syncAuth(null);
      }
    }
  });

  // Respond to direct queries from popup or background service worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'QUERY_PAGE_AUTH') {
      const user = checkAndSyncAuth();
      sendResponse({ user });
      return true;
    }
  });

  // ── Real-Time Page Load Verification ───────────────────────────────────
  // Catches any page load that escaped onBeforeNavigate (e.g. autofill prerender, fast link clicks)
  (function verifyCurrentPage() {
    const href = window.location.href;
    if (!href || (!href.startsWith('http://') && !href.startsWith('https://'))) {
      return;
    }
    if (isPhishRadarPage()) {
      return;
    }

    try {
      chrome.runtime.sendMessage({
        type: 'VERIFY_PAGE_LOAD',
        url: href
      }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.isDangerous && res.warningUrl) {
          window.location.replace(res.warningUrl);
        }
      });
    } catch {}
  })();

  // ── Global Link Click Interceptor ──────────────────────────────────────
  // When clicking an external link, proactively notify background to begin scanning
  document.addEventListener('click', (e) => {
    try {
      const anchor = e.target.closest('a[href]');
      if (!anchor || !anchor.href) return;
      const href = anchor.href;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        chrome.runtime.sendMessage({
          type: 'LINK_CLICKED',
          url: href
        }).catch(() => {});
      }
    } catch {}
  }, true);
})();
