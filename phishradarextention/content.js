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

  function syncAuth(user) {
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
        } else {
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

      // If neither is present, mark as unauthenticated
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
})();
