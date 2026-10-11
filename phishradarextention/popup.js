// PhishRadar Popup Script

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const toggle = document.getElementById('protection-toggle');
  const toggleLabel = document.getElementById('toggle-label');
  const statusBar = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const tabUrlEl = document.getElementById('tab-url');
  const btnScan = document.getElementById('btn-scan');
  const scanPanel = document.getElementById('scan-panel');
  const scanVerdict = document.getElementById('scan-verdict');
  const scanScore = document.getElementById('scan-score');
  const scanMessage = document.getElementById('scan-message');
  const scanDetails = document.getElementById('scan-details');

  let currentTabUrl = null;

  // Load protection state
  const stored = await chrome.storage.local.get('protectionEnabled');
  const isEnabled = stored.protectionEnabled !== false;
  toggle.checked = isEnabled;
  updateProtectionUI(isEnabled);

  // Get current tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      currentTabUrl = tab.url;
      try {
        const parsed = new URL(tab.url);
        tabUrlEl.textContent = parsed.hostname + parsed.pathname;
        tabUrlEl.title = tab.url;
      } catch {
        tabUrlEl.textContent = tab.url.substring(0, 50);
        tabUrlEl.title = tab.url;
      }
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

  // Scan button handler
  btnScan.addEventListener('click', async () => {
    if (!currentTabUrl) return;

    // Validate URL
    try {
      const parsed = new URL(currentTabUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        showScanResult({ error: true, message: 'Only HTTP/HTTPS URLs can be scanned' });
        return;
      }
    } catch {
      showScanResult({ error: true, message: 'Invalid URL' });
      return;
    }

    // Show scanning state
    setScanning(true);
    scanPanel.classList.remove('hidden');

    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SCAN_URL',
        url: currentTabUrl
      });
      showScanResult(result);
    } catch (err) {
      showScanResult({ error: true, message: 'Scan failed: ' + err.message });
    } finally {
      setScanning(false);
    }
  });

  function updateProtectionUI(enabled) {
    toggleLabel.textContent = enabled ? 'ON' : 'OFF';
    toggleLabel.classList.toggle('off', !enabled);

    if (enabled) {
      statusBar.className = 'status-bar';
      statusText.textContent = 'Protection Active';
    } else {
      statusBar.className = 'status-bar disabled';
      statusText.textContent = 'Protection Disabled';
    }
  }

  function setScanning(scanning) {
    if (scanning) {
      statusBar.className = 'status-bar scanning';
      statusText.textContent = 'Scanning...';
      btnScan.disabled = true;
      btnScan.innerHTML = '<span class="spinner"></span> Scanning...';
      scanVerdict.textContent = 'Scanning...';
      scanVerdict.className = 'scan-verdict';
      scanScore.textContent = '';
      scanMessage.textContent = 'Analyzing URL with ML model and regex patterns...';
      scanDetails.innerHTML = '';
    } else {
      const enabled = toggle.checked;
      updateProtectionUI(enabled);
      btnScan.disabled = false;
      btnScan.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="2" fill="none"/>
        <path d="M11 11l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg> Scan This Page`;
    }
  }

  function showScanResult(result) {
    scanPanel.classList.remove('hidden');

    if (result.error) {
      scanVerdict.textContent = 'ERROR';
      scanVerdict.className = 'scan-verdict error';
      scanScore.textContent = '';
      scanMessage.textContent = result.message || 'Backend unavailable';
      scanDetails.innerHTML = '';
      statusBar.className = 'status-bar disabled';
      statusText.textContent = 'Scan Error';
      return;
    }

    const verdict = result.finalresult || 'UNKNOWN';
    const score = result.risckscore;
    const risklevel = result.risklevel || '';

    // Set verdict display
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

    // Set score display
    if (score !== undefined && score !== null) {
      scanScore.textContent = score;
      if (score >= 60) {
        scanScore.className = 'scan-score high';
      } else if (score >= 30) {
        scanScore.className = 'scan-score medium';
      } else {
        scanScore.className = 'scan-score low';
      }
    } else {
      scanScore.textContent = '';
    }

    // Set message
    scanMessage.textContent = result.message || '';

    // Set findings
    const findings = result.findings || [];
    const dangerFindings = new Set([
      'IP_ADDRESS_IN_URL', 'HIGHLY_SUSPICIOUS_DOMAIN',
      'URL_SHORTENER_DETECTED'
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

    // Update ML and regex info
    const extraInfo = [];
    if (result.mlresult) extraInfo.push(`ML: ${result.mlresult}`);
    if (result.regexresult) extraInfo.push(`Regex: ${result.regexresult}`);
    if (extraInfo.length > 0) {
      const infoTag = document.createElement('span');
      infoTag.className = 'finding-tag';
      infoTag.textContent = extraInfo.join(' | ');
      scanDetails.appendChild(infoTag);
    }

    // Update status bar
    if (verdict === 'SUSPICIOUS') {
      statusBar.className = 'status-bar danger';
      statusText.textContent = 'Threat Detected!';
    } else if (verdict === 'REVIEW') {
      statusBar.className = 'status-bar warning';
      statusText.textContent = 'Suspicious Indicators';
    } else {
      statusBar.className = 'status-bar';
      statusText.textContent = 'Page is Safe';
    }
  }
}
