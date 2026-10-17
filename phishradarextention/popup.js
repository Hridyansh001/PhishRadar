// PhishRadar Popup Script — Redesigned

document.addEventListener('DOMContentLoaded', init);

async function init() {
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

  // Load protection state
  const stored = await chrome.storage.local.get(['protectionEnabled', 'scanCount', 'blockCount', 'lastScanTimestamp', 'lastScanVerdict']);
  const isEnabled = stored.protectionEnabled !== false;
  toggle.checked = isEnabled;
  updateProtectionUI(isEnabled);

  // Load stats from storage
  statScanned.textContent = stored.scanCount || 0;
  statBlocked.textContent = stored.blockCount || 0;

  // Load last scan info
  if (stored.lastScanTimestamp) {
    const elapsed = Date.now() - stored.lastScanTimestamp;
    lastScanTime.textContent = formatTimeAgo(elapsed);
    lastScanResult.textContent = stored.lastScanVerdict || 'Scan completed';
    if (stored.lastScanVerdict && stored.lastScanVerdict.includes('Phishing')) {
      lastScanResult.style.color = '#f85149';
    }
  }

  // Get current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      currentTabUrl = tab.url;
      try {
        const parsed = new URL(tab.url);
        tabUrlEl.textContent = parsed.hostname;
        tabUrlEl.title = tab.url;
      } catch {
        tabUrlEl.textContent = tab.url.substring(0, 40);
        tabUrlEl.title = tab.url;
      }

      // Auto-scan the current tab
      autoScanCurrentTab(tab.url);
    }
  } catch {
    tabUrlEl.textContent = 'Unable to read tab URL';
  }

  // Toggle handler
  toggle.addEventListener('change', async () => {
    const enabled = toggle.checked;
    await chrome.storage.local.set({ protectionEnabled: enabled });
    updateProtectionUI(enabled);
  });

  // Tab info card click — trigger scan
  document.getElementById('tab-info').addEventListener('click', () => {
    if (currentTabUrl) autoScanCurrentTab(currentTabUrl);
  });

  function updateProtectionUI(enabled) {
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

      if (result && (result.finalresult === 'SUSPICIOUS')) {
        newBlockCount += 1;
      }

      await chrome.storage.local.set({
        scanCount: newScanCount,
        blockCount: newBlockCount,
        lastScanTimestamp: Date.now(),
        lastScanVerdict: result.finalresult === 'SUSPICIOUS' ? 'Phishing indicators detected' : 'No threats found'
      });

      statScanned.textContent = newScanCount;
      statBlocked.textContent = newBlockCount;
      lastScanTime.textContent = 'Just now';
      lastScanResult.textContent = result.finalresult === 'SUSPICIOUS' ? 'Phishing indicators detected' : 'No threats found';
      if (result.finalresult === 'SUSPICIOUS') {
        lastScanResult.style.color = '#f85149';
      } else {
        lastScanResult.style.color = '';
      }

    } catch (err) {
      updateWebsiteStatus('safe', 'Backend offline');
    }
  }

  function updateWebsiteStatus(level, text) {
    const dot = websiteStatus.querySelector('.status-dot');
    dot.className = 'status-dot ' + level;
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
    scanPanel.classList.remove('hidden');

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

    // Score
    const score = result.risckscore;
    if (score !== undefined && score !== null) {
      scanScore.textContent = score + '/100';
      if (score >= 60) scanScore.className = 'scan-score high';
      else if (score >= 30) scanScore.className = 'scan-score medium';
      else scanScore.className = 'scan-score low';
    } else {
      scanScore.textContent = '';
    }

    scanMessage.textContent = result.message || '';

    // Findings
    const findings = result.findings || [];
    const dangerFindings = new Set([
      'IP_ADDRESS_IN_URL', 'HIGHLY_SUSPICIOUS_DOMAIN', 'URL_SHORTENER_DETECTED'
    ]);
    const warningFindings = new Set([
      'SUSPICIOUS_KEYWORD', 'SUSPICIOUS_TLD', 'NOT_HTTPS',
      'UNUSUALLY_LONG_URL', 'PERCENT_ENCODING_PRESENT'
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
