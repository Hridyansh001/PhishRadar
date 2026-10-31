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

  // ── Intelligent DOM Feature Extractor ─────────────────────────────────
  const TARGET_BRANDS = [
    { name: 'paypal', pattern: /\bpaypal\b/i, domains: ['paypal.com', 'paypal.me'] },
    { name: 'google', pattern: /\b(google\s*account|gmail|google\s*drive|google\s*sign[\s-]?in)\b/i, domains: ['google.com', 'accounts.google.com'] },
    { name: 'microsoft', pattern: /\b(microsoft\s*office|office\s*365|outlook|microsoft\s*account|onedrive)\b/i, domains: ['microsoft.com', 'live.com', 'office.com', 'login.microsoftonline.com'] },
    { name: 'apple', pattern: /\b(apple\s*id|icloud)\b/i, domains: ['apple.com', 'icloud.com'] },
    { name: 'amazon', pattern: /\b(amazon\s*prime|amazon\s*sign[\s-]?in)\b/i, domains: ['amazon.com', 'amazon.co.uk'] },
    { name: 'netflix', pattern: /\bnetflix\b/i, domains: ['netflix.com'] },
    { name: 'facebook', pattern: /\bfacebook\s*login\b/i, domains: ['facebook.com', 'fb.com'] },
    { name: 'instagram', pattern: /\binstagram\b/i, domains: ['instagram.com'] },
    { name: 'chase', pattern: /\bchase\s*(bank|online)?\b/i, domains: ['chase.com'] },
    { name: 'wellsfargo', pattern: /\bwells\s*fargo\b/i, domains: ['wellsfargo.com'] },
    { name: 'bankofamerica', pattern: /\bbank\s*of\s*america\b/i, domains: ['bankofamerica.com'] },
    { name: 'coinbase', pattern: /\bcoinbase\b/i, domains: ['coinbase.com'] },
    { name: 'metamask', pattern: /\bmetamask\b/i, domains: ['metamask.io'] },
    { name: 'binance', pattern: /\bbinance\b/i, domains: ['binance.com'] }
  ];

  function extractDOMFeatures() {
    try {
      const hostname = window.location.hostname.toLowerCase();
      const forms = Array.from(document.querySelectorAll('form'));
      const passwordInputs = Array.from(document.querySelectorAll('input[type="password"], input[autocomplete*="password"]'));
      const hiddenInputs = Array.from(document.querySelectorAll('input[type="hidden"]'));
      const submitButtons = Array.from(document.querySelectorAll('button[type="submit"], input[type="submit"]'));
      const iframes = Array.from(document.querySelectorAll('iframe'));
      const images = Array.from(document.querySelectorAll('img'));
      const cssLinks = Array.from(document.querySelectorAll('link[rel*="stylesheet"]'));
      const scripts = Array.from(document.querySelectorAll('script'));

      // Check for form action pointing to a different origin
      const externalActions = [];
      let hasExternalFormSubmit = false;

      for (const form of forms) {
        const action = form.getAttribute('action');
        if (action && (action.startsWith('http://') || action.startsWith('https://') || action.startsWith('//'))) {
          try {
            const parsedAction = new URL(action, window.location.href);
            if (parsedAction.hostname !== hostname && !parsedAction.hostname.endsWith('.' + hostname)) {
              hasExternalFormSubmit = true;
              externalActions.push(parsedAction.hostname);
            }
          } catch {}
        }
      }

      // Check for brand mismatch (e.g. Page says "Microsoft" or "PayPal" but domain is random)
      const pageTitle = document.title || '';
      const bodySnippet = (document.body ? document.body.innerText.substring(0, 3000) : '') + ' ' + pageTitle;

      let suspiciousBrandMismatch = false;
      let matchedBrand = null;

      for (const brand of TARGET_BRANDS) {
        if (brand.pattern.test(bodySnippet)) {
          const isLegitDomain = brand.domains.some(d => hostname === d || hostname.endsWith('.' + d));
          if (!isLegitDomain) {
            suspiciousBrandMismatch = true;
            matchedBrand = brand.name;
            break;
          }
        }
      }

      return {
        hasPasswordField: passwordInputs.length > 0,
        noOfPasswordField: passwordInputs.length,
        hasExternalFormSubmit: hasExternalFormSubmit,
        externalFormActions: externalActions.slice(0, 3),
        noOfiFrame: iframes.length,
        hasHiddenFields: hiddenInputs.length > 0,
        noOfHiddenFields: hiddenInputs.length,
        hasSubmitButton: submitButtons.length > 0 || forms.length > 0,
        noOfImage: images.length,
        noOfCSS: cssLinks.length,
        noOfJS: scripts.length,
        pageTitle: pageTitle.substring(0, 150),
        suspiciousBrandMismatch: suspiciousBrandMismatch,
        impersonatedBrand: matchedBrand
      };
    } catch (e) {
      return null;
    }
  }

  // ── Real-Time Page Load Verification ───────────────────────────────────
  // Catches any page load that escaped onBeforeNavigate (e.g. autofill prerender, fast link clicks)
  function verifyCurrentPage() {
    const href = window.location.href;
    if (!href || (!href.startsWith('http://') && !href.startsWith('https://'))) {
      return;
    }
    if (isPhishRadarPage()) {
      return;
    }

    const domFeatures = extractDOMFeatures();

    try {
      chrome.runtime.sendMessage({
        type: 'VERIFY_PAGE_LOAD',
        url: href,
        domFeatures: domFeatures
      }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.isDangerous && res.warningUrl) {
          window.location.replace(res.warningUrl);
        }
      });
    } catch {}
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    verifyCurrentPage();
  } else {
    document.addEventListener('DOMContentLoaded', verifyCurrentPage);
    window.addEventListener('load', verifyCurrentPage);
  }

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
