// PhishRadar Popup Script — Auth-Gated Real-Time Telemetry

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const authPanel = document.getElementById('auth-panel');
  const dashboardPanel = document.getElementById('dashboard-panel');

  // Auth Panel Elements
  const btnRedirectLogin = document.getElementById('btn-redirect-login');
  const btnRedirectSignup = document.getElementById('btn-redirect-signup');
  const toggleDirectLogin = document.getElementById('toggle-direct-login');
  const toggleIcon = document.getElementById('toggle-icon');
  const directLoginForm = document.getElementById('direct-login-form');
  const directEmail = document.getElementById('direct-email');
  const directPassword = document.getElementById('direct-password');
  const authError = document.getElementById('auth-error');
  const btnDirectSubmit = document.getElementById('btn-direct-submit');
  const btnDirectText = document.getElementById('btn-direct-text');
  const btnCheckSync = document.getElementById('btn-check-sync');
  const syncStatusText = document.getElementById('sync-status-text');

  // Dashboard Panel Elements
  const userAvatar = document.getElementById('user-avatar');
  const userUname = document.getElementById('user-uname');
  const userBadge = document.getElementById('user-badge');
  const btnSignout = document.getElementById('btn-signout');
  const btnOpenDashQuick = document.getElementById('btn-open-dash-quick');
  const dashboardLink = document.getElementById('dashboard-link');

  const toggle = document.getElementById('protection-toggle');
  const toggleLabel = document.getElementById('toggle-label');
  const tabUrlEl = document.getElementById('tab-url');
  const websiteStatus = document.getElementById('website-status');
  const statScanned = document.getElementById('stat-scanned');
  const statBlocked = document.getElementById('stat-blocked');
  const lastScanTime = document.getElementById('last-scan-time');
  const lastScanResult = document.getElementById('last-scan-result');
  const btnScan = document.getElementById('btn-scan');
  const scanPanel = document.getElementById('scan-panel');
  const scanVerdict = document.getElementById('scan-verdict');
  const scanScore = document.getElementById('scan-score');
  const scanMessage = document.getElementById('scan-message');
  const scanDetails = document.getElementById('scan-details');

  let currentTabUrl = null;
  let currentUser = null;

  // Listen for storage changes in real time (e.g. login/logout from another tab)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.phishradar_user) {
        checkAuthAndRender();
      }
      if (changes.protectionEnabled && toggle) {
        const isEnabled = changes.protectionEnabled.newValue !== false;
        toggle.checked = isEnabled;
        updateProtectionUI(isEnabled);
      }
    }
  });

  // Check auth state on launch
  await checkAuthAndRender();

  async function checkAuthAndRender() {
    // 1. Check extension local storage
    const stored = await chrome.storage.local.get(['phishradar_user', 'userId']);
    if (stored.phishradar_user) {
      currentUser = stored.phishradar_user;
      showDashboardView(currentUser);
      return;
    }

    // 2. Actively scan active tab and open tabs directly from popup
    const tabUser = await findUserInOpenTabs();
    if (tabUser) {
      currentUser = tabUser;
      showDashboardView(currentUser);
      return;
    }

    // 3. User is not logged in: display the Dashboard in Guest Mode with Active Protection!
    currentUser = null;
    showDashboardView(null);
  }

  async function findUserInOpenTabs() {
    // Method A: Check active tab in current window
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
        const u = await readUserFromTab(activeTab);
        if (u) return u;
      }
    } catch (e) {
      console.warn('[PhishRadar] Error checking active tab:', e);
    }

    // Method B: Check all other tabs on localhost / 127.0.0.1
    try {
      const allTabs = await chrome.tabs.query({});
      for (const tab of allTabs) {
        if (!tab.id || !tab.url) continue;
        const urlStr = tab.url.toLowerCase();
        if (urlStr.includes('localhost') || urlStr.includes('127.0.0.1') || tab.title?.includes('PhishRadar')) {
          const u = await readUserFromTab(tab);
          if (u) return u;
        }
      }
    } catch (e) {
      console.warn('[PhishRadar] Error checking open tabs:', e);
    }

    // Method C: Ask background worker fallback
    try {
      const bgRes = await chrome.runtime.sendMessage({ type: 'CHECK_OPEN_TABS_AUTH' });
      if (bgRes && bgRes.user) {
        await chrome.storage.local.set({ phishradar_user: bgRes.user, userId: bgRes.user.userid });
        return bgRes.user;
      }
    } catch { }

    return null;
  }

  async function readUserFromTab(tab) {
    if (!tab.id) return null;

    // 1. Execute script to read localStorage of page directly
    if (chrome.scripting) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            try {
              const raw = localStorage.getItem('phishradar_user');
              if (raw) return JSON.parse(raw);
              const attr = document.documentElement.getAttribute('data-phishradar-user');
              if (attr) return JSON.parse(attr);
            } catch {
              return null;
            }
            return null;
          }
        });
        if (results && results[0] && results[0].result) {
          const user = results[0].result;
          await chrome.storage.local.set({ phishradar_user: user, userId: user.userid });
          return user;
        }
      } catch (err) {
        // Scripting might fail if permissions not reloaded yet
      }
    }

    // 2. Try sending message to content script
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'QUERY_PAGE_AUTH' });
      if (res && res.user) {
        await chrome.storage.local.set({ phishradar_user: res.user, userId: res.user.userid });
        return res.user;
      }
    } catch { }

    return null;
  }

  function showAuthView() {
    authPanel.classList.remove('hidden');
    dashboardPanel.classList.add('hidden');
    if (syncStatusText) {
      syncStatusText.textContent = 'Auto-detecting web dashboard...';
    }
  }

  function showDashboardView(user) {
    authPanel.classList.add('hidden');
    dashboardPanel.classList.remove('hidden');

    if (user) {
      if (userAvatar) userAvatar.textContent = (user.uname ? user.uname.charAt(0) : 'U').toUpperCase();
      if (userUname) userUname.textContent = user.uname || 'User';
      if (userBadge) userBadge.textContent = user.userid ? `User #${user.userid}` : 'Active Session';
      if (btnSignout) btnSignout.style.display = 'inline-block';
      if (btnOpenDashQuick) {
        btnOpenDashQuick.style.display = 'inline-flex';
        btnOpenDashQuick.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span>Dashboard</span>';
      }
    } else {
      if (userAvatar) userAvatar.textContent = '🛡️';
      if (userUname) userUname.textContent = 'Active Protection';
      if (userBadge) userBadge.textContent = 'Guest Mode';
      if (btnSignout) btnSignout.style.display = 'none';
      if (btnOpenDashQuick) {
        btnOpenDashQuick.style.display = 'inline-flex';
        btnOpenDashQuick.innerHTML = '<span>Sign In / Sync</span>';
      }
    }

    // Initialize telemetry and scanner controls
    initializeDashboardControls();
  }

  // ==============================================
  // Auth View Handlers
  // ==============================================

  // Redirect to Dashboard Login page
  if (btnRedirectLogin) {
    btnRedirectLogin.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD_LOGIN' });
      window.close();
    });
  }

  // Redirect to Dashboard Signup page
  if (btnRedirectSignup) {
    btnRedirectSignup.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD_SIGNUP' });
      window.close();
    });
  }

  // Toggle inline login form
  if (toggleDirectLogin && directLoginForm) {
    toggleDirectLogin.addEventListener('click', () => {
      const isHidden = directLoginForm.classList.toggle('hidden');
      if (toggleIcon) {
        toggleIcon.classList.toggle('expanded', !isHidden);
      }
      if (!isHidden && directEmail) {
        directEmail.focus();
      }
    });
  }

  // Submit direct login form
  if (directLoginForm) {
    directLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!directEmail || !directPassword) return;

      const email = directEmail.value.trim();
      const password = directPassword.value;
      if (!email || !password) return;

      if (authError) authError.classList.add('hidden');
      if (btnDirectSubmit) btnDirectSubmit.disabled = true;
      if (btnDirectText) btnDirectText.textContent = 'Authenticating...';

      try {
        const response = await fetch('http://localhost:8080/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          let errText = 'Invalid credentials. Please verify your email and password.';
          try {
            const errJson = await response.json();
            if (errJson.error) errText = errJson.error;
          } catch { }
          throw new Error(errText);
        }

        const userData = await response.json();
        // Save to extension storage
        await chrome.storage.local.set({
          phishradar_user: userData,
          userId: userData.userid
        });

        currentUser = userData;
        showDashboardView(currentUser);
      } catch (err) {
        if (authError) {
          authError.textContent = err.message || 'Unable to connect to backend server on port 8080.';
          authError.classList.remove('hidden');
        }
      } finally {
        if (btnDirectSubmit) btnDirectSubmit.disabled = false;
        if (btnDirectText) btnDirectText.textContent = 'Sign In';
      }
    });
  }

  // Check sync button
  if (btnCheckSync) {
    btnCheckSync.addEventListener('click', async () => {
      if (syncStatusText) syncStatusText.textContent = 'Inspecting current tab session...';
      try {
        const user = await findUserInOpenTabs();
        if (user) {
          currentUser = user;
          showDashboardView(currentUser);
        } else {
          if (syncStatusText) {
            syncStatusText.textContent = 'Session not detected. Refresh tab (F5) or sign in below.';
          }
        }
      } catch {
        if (syncStatusText) {
          syncStatusText.textContent = 'Unable to query tabs. Sign in directly or reload tab.';
        }
      }
    });
  }

  // ==============================================
  // Dashboard View Handlers & Logic
  // ==============================================

  // Sign out handler
  if (btnSignout) {
    btnSignout.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'LOGOUT_USER' });
      await chrome.storage.local.remove(['phishradar_user', 'userId']);
      currentUser = null;
      if (directPassword) directPassword.value = '';
      if (authError) authError.classList.add('hidden');
      showAuthView();
    });
  }

  // Quick Open Dashboard buttons
  if (btnOpenDashQuick) {
    btnOpenDashQuick.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    });
  }
  if (dashboardLink) {
    dashboardLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    });
  }

  async function initializeDashboardControls() {
    // Load protection state
    const stored = await chrome.storage.local.get([
      'protectionEnabled',
      'scanCount',
      'blockCount',
      'lastScanTimestamp',
      'lastScanVerdict'
    ]);

    const isEnabled = stored.protectionEnabled !== false;
    if (toggle) toggle.checked = isEnabled;
    updateProtectionUI(isEnabled);

    // Load stats
    if (statScanned) statScanned.textContent = stored.scanCount || 0;
    if (statBlocked) statBlocked.textContent = stored.blockCount || 0;

    // Load last scan
    if (stored.lastScanTimestamp && lastScanTime && lastScanResult) {
      const elapsed = Date.now() - stored.lastScanTimestamp;
      lastScanTime.textContent = formatTimeAgo(elapsed);
      lastScanResult.textContent = stored.lastScanVerdict || 'Scan completed';
      if (stored.lastScanVerdict && stored.lastScanVerdict.includes('Phishing')) {
        lastScanResult.style.color = '#f85149';
      }
    }

    // Get current tab URL and scan
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        currentTabUrl = tab.url;
        try {
          const parsed = new URL(tab.url);
          if (tabUrlEl) {
            tabUrlEl.textContent = parsed.hostname;
            tabUrlEl.title = tab.url;
          }
        } catch {
          if (tabUrlEl) {
            tabUrlEl.textContent = tab.url.substring(0, 40);
            tabUrlEl.title = tab.url;
          }
        }

        autoScanCurrentTab(tab.url);
      }
    } catch {
      if (tabUrlEl) tabUrlEl.textContent = 'Unable to read tab URL';
    }
  }

  // Toggle handler
  if (toggle) {
    toggle.addEventListener('change', async () => {
      const enabled = toggle.checked;
      await chrome.storage.local.set({ protectionEnabled: enabled });
      updateProtectionUI(enabled);
    });
  }

  // Tab info card click — re-scan
  const tabInfoEl = document.getElementById('tab-info');
  if (tabInfoEl) {
    tabInfoEl.addEventListener('click', () => {
      if (currentTabUrl) autoScanCurrentTab(currentTabUrl);
    });
  }

  // Quick URL Scanner controls
  const manualUrlInput = document.getElementById('manual-url-input');
  const btnManualScan = document.getElementById('btn-manual-scan');
  const btnTestInterstitial = document.getElementById('btn-test-interstitial');
  let lastManualScanResult = null;
  let lastManualUrl = null;

  async function performManualScan() {
    if (!manualUrlInput) return;
    let url = manualUrlInput.value.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    btnManualScan.disabled = true;
    btnManualScan.textContent = '...';
    if (btnTestInterstitial) btnTestInterstitial.classList.add('hidden');

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SCAN_URL',
        url: url
      });

      lastManualScanResult = result;
      lastManualUrl = url;

      showScanResult(result);

      const score = Number(result.risckscore ?? result.riskscore ?? 0);
      const isDangerous = score >= 20 || result.finalresult === 'SUSPICIOUS' || result.finalresult === 'REVIEW';

      if (isDangerous && btnTestInterstitial) {
        btnTestInterstitial.classList.remove('hidden');
        btnTestInterstitial.textContent = score > 60
          ? `View Warning Block (${score}/100 Threat)`
          : `View Review Warning (${score}/100 Review)`;
      }
    } catch (err) {
      if (scanMessage) scanMessage.textContent = 'Error scanning: ' + err.message;
    } finally {
      btnManualScan.disabled = false;
      btnManualScan.textContent = 'Scan';
    }
  }

  if (btnManualScan) {
    btnManualScan.addEventListener('click', performManualScan);
  }
  if (manualUrlInput) {
    manualUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performManualScan();
    });
  }

  if (btnTestInterstitial) {
    btnTestInterstitial.addEventListener('click', () => {
      if (!lastManualUrl || !lastManualScanResult) return;
      const params = new URLSearchParams();
      params.set('url', lastManualUrl);
      params.set('finalresult', lastManualScanResult.finalresult || 'SUSPICIOUS');
      params.set('risckscore', String(lastManualScanResult.risckscore ?? ''));
      params.set('risklevel', lastManualScanResult.risklevel || 'HIGH');
      params.set('message', lastManualScanResult.message || '');
      params.set('domain', lastManualScanResult.domain || '');
      params.set('findings', JSON.stringify(lastManualScanResult.findings || []));
      params.set('mlresult', lastManualScanResult.mlresult || '');
      params.set('regexresult', lastManualScanResult.regexresult || '');
      params.set('actiontaken', lastManualScanResult.actiontaken || 'WARNING');
      const warningUrl = chrome.runtime.getURL('warning.html') + '?' + params.toString();
      chrome.tabs.create({ url: warningUrl });
    });
  }

  function updateProtectionUI(enabled) {
    if (!toggleLabel) return;
    toggleLabel.textContent = enabled ? 'ON' : 'OFF';
    toggleLabel.classList.toggle('off', !enabled);
  }

  async function autoScanCurrentTab(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        updateWebsiteStatus('safe', 'System page');
        return;
      }
    } catch {
      return;
    }

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SCAN_URL',
        url: url
      });
      showScanResult(result);

      // Update stats
      const data = await chrome.storage.local.get(['scanCount', 'blockCount']);
      const newScanCount = (data.scanCount || 0) + 1;
      let newBlockCount = data.blockCount || 0;

      if (result && result.finalresult === 'SUSPICIOUS') {
        newBlockCount += 1;
      }

      await chrome.storage.local.set({
        scanCount: newScanCount,
        blockCount: newBlockCount,
        lastScanTimestamp: Date.now(),
        lastScanVerdict: result.finalresult === 'SUSPICIOUS' ? 'Phishing indicators detected' : 'No threats found'
      });

      if (statScanned) statScanned.textContent = newScanCount;
      if (statBlocked) statBlocked.textContent = newBlockCount;
      if (lastScanTime) lastScanTime.textContent = 'Just now';
      if (lastScanResult) {
        lastScanResult.textContent = result.finalresult === 'SUSPICIOUS' ? 'Phishing indicators detected' : 'No threats found';
        lastScanResult.style.color = result.finalresult === 'SUSPICIOUS' ? '#f85149' : '';
      }
    } catch {
      updateWebsiteStatus('safe', 'Backend offline');
    }
  }

  function updateWebsiteStatus(level, text) {
    if (!websiteStatus) return;
    const dot = websiteStatus.querySelector('.status-dot');
    if (dot) dot.className = 'status-dot ' + level;
    websiteStatus.childNodes[websiteStatus.childNodes.length - 1].textContent = ' ' + text;
  }

  function showScanResult(result) {
    if (!result) return;

    if (result.error) {
      updateWebsiteStatus('warning', 'Scan error');
      return;
    }

    const verdict = result.finalresult || 'UNKNOWN';

    // Update current website status
    if (verdict === 'SUSPICIOUS') {
      updateWebsiteStatus('danger', 'Blocked');
    } else if (verdict === 'REVIEW') {
      updateWebsiteStatus('warning', 'Suspicious');
    } else {
      updateWebsiteStatus('safe', 'Safe');
    }

    // Show scan panel with details
    if (scanPanel) scanPanel.classList.remove('hidden');

    if (scanVerdict) {
      scanVerdict.textContent = verdict;
      if (verdict === 'SAFE') {
        scanVerdict.className = 'scan-verdict safe';
      } else if (verdict === 'REVIEW') {
        scanVerdict.className = 'scan-verdict review';
      } else if (verdict === 'SUSPICIOUS') {
        scanVerdict.className = 'scan-verdict suspicious';
      } else {
        scanVerdict.className = 'scan-verdict';
      }
    }

    // Score
    const score = Number(result.risckscore ?? result.riskscore ?? 0);
    if (scanScore) {
      if (score !== undefined && score !== null) {
        scanScore.textContent = score + '/100';
        if (score > 60) scanScore.className = 'scan-score high';
        else if (score >= 20) scanScore.className = 'scan-score medium';
        else scanScore.className = 'scan-score low';
      } else {
        scanScore.textContent = '';
      }
    }

    if (scanMessage) {
      scanMessage.textContent = result.message || '';
    }

    // Findings
    if (scanDetails) {
      const findings = result.findings || [];
      const dangerFindings = new Set([
        'BRAND_IMPERSONATION', 'TYPOSQUATTING_DETECTED', 'HIGHLY_SUSPICIOUS_DOMAIN',
        'IP_ADDRESS_IN_URL', 'AT_SYMBOL_IN_URL', 'URL_SHORTENER_DETECTED'
      ]);
      const warningFindings = new Set([
        'SUSPICIOUS_KEYWORD_IN_DOMAIN', 'SUSPICIOUS_KEYWORD_IN_PATH', 'SUSPICIOUS_KEYWORD',
        'SUSPICIOUS_TLD', 'EXCESSIVE_HYPHENS_IN_DOMAIN', 'EXCESSIVE_SUBDOMAINS',
        'DOUBLE_SLASH_IN_PATH', 'NOT_HTTPS', 'UNUSUALLY_LONG_URL', 'PERCENT_ENCODING_PRESENT'
      ]);

      scanDetails.innerHTML = '';
      if (findings.length > 0) {
        findings.forEach(f => {
          const tag = document.createElement('span');
          tag.className = 'finding-tag';
          if (dangerFindings.has(f)) tag.className += ' danger';
          else if (warningFindings.has(f)) tag.className += ' warning';
          tag.textContent = f.replace(/_/g, ' ');
          scanDetails.appendChild(tag);
        });
      }

      // ML and regex info
      const extraInfo = [];
      if (result.mlresult) extraInfo.push(`ML: ${result.mlresult}`);
      if (result.regexresult) extraInfo.push(`Regex: ${result.regexresult}`);
      if (extraInfo.length > 0) {
        const infoTag = document.createElement('span');
        infoTag.className = 'finding-tag';
        infoTag.textContent = extraInfo.join(' | ');
        scanDetails.appendChild(infoTag);
      }
    }
  }

  function formatTimeAgo(ms) {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return seconds + ' seconds ago';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' minutes ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + ' hours ago';
    return Math.floor(hours / 24) + ' days ago';
  }
}
