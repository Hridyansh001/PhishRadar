// PhishRadar Warning Page Script
// Reads scan result from URL parameters and handles block/continue actions

(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);

  const destinationUrl = params.get('url') || '';
  const finalresult = params.get('finalresult') || '';
  const risckscore = params.get('risckscore') || '';
  const risklevel = params.get('risklevel') || '';
  const message = params.get('message') || '';
  const domain = params.get('domain') || '';
  const mlresult = params.get('mlresult') || '';
  const regexresult = params.get('regexresult') || '';
  const actiontaken = params.get('actiontaken') || '';

  let findings = [];
  try {
    findings = JSON.parse(params.get('findings') || '[]');
    if (!Array.isArray(findings)) findings = [];
  } catch {
    findings = [];
  }

  // Elements
  const urlEl = document.getElementById('destination-url');
  const domainEl = document.getElementById('destination-domain');
  const verdictEl = document.getElementById('detail-verdict');
  const scoreEl = document.getElementById('detail-score');
  const risklevelEl = document.getElementById('detail-risklevel');
  const mlEl = document.getElementById('detail-ml');
  const regexEl = document.getElementById('detail-regex');
  const findingsSection = document.getElementById('findings-section');
  const findingsList = document.getElementById('findings-list');
  const messageEl = document.getElementById('warning-message');

  // Populate URL (safely via textContent)
  if (destinationUrl) {
    urlEl.textContent = destinationUrl.length > 200
      ? destinationUrl.substring(0, 200) + '…'
      : destinationUrl;
  }

  if (domain) {
    domainEl.textContent = 'Domain: ' + domain;
  }

  // Populate detection details
  const score = parseInt(risckscore, 10) || 0;
  const isHighThreat = score > 60 || finalresult === 'SUSPICIOUS' || actiontaken === 'WARNING';

  // Dynamic Page Title
  const titleEl = document.querySelector('.warning-title');
  if (titleEl) {
    if (isHighThreat) {
      titleEl.innerHTML = '<span class="text-danger">Threats & Phishing</span> Blocked';
    } else {
      titleEl.innerHTML = '<span class="text-warning" style="color: #d97706;">Suspicious Site</span> — Review Required';
    }
  }

  // Warning Icon Color
  const iconPath = document.querySelector('.danger-icon svg path');
  if (iconPath && !isHighThreat) {
    iconPath.setAttribute('stroke', '#d97706');
    const lines = document.querySelectorAll('.danger-icon svg line, .danger-icon svg circle');
    lines.forEach(l => {
      l.setAttribute('stroke', '#d97706');
      l.setAttribute('fill', '#d97706');
    });
  }

  if (finalresult) {
    verdictEl.textContent = finalresult;
    if (finalresult === 'SUSPICIOUS') verdictEl.classList.add('danger');
    else if (finalresult === 'REVIEW') verdictEl.classList.add('warning');
    else verdictEl.classList.add('safe');
  }

  if (risckscore) {
    scoreEl.textContent = risckscore + ' / 100';
    if (score > 60) scoreEl.classList.add('danger');
    else if (score >= 20) scoreEl.classList.add('warning');
    else scoreEl.classList.add('safe');
  }

  if (risklevel) {
    risklevelEl.textContent = risklevel;
    if (risklevel === 'HIGH' || score > 60) risklevelEl.classList.add('danger');
    else if (risklevel === 'MEDIUM' || score >= 20) risklevelEl.classList.add('warning');
    else risklevelEl.classList.add('safe');
  }

  if (mlresult) {
    mlEl.textContent = mlresult;
    if (mlresult === 'PHISHING') mlEl.classList.add('danger');
    else mlEl.classList.add('safe');
  }

  if (regexresult) {
    regexEl.textContent = regexresult;
    if (regexresult === 'SUSPICIOUS') regexEl.classList.add('warning');
    else regexEl.classList.add('safe');
  }

  // Populate findings
  const dangerFindings = new Set([
    'BRAND_IMPERSONATION', 'TYPOSQUATTING_DETECTED', 'HIGHLY_SUSPICIOUS_DOMAIN',
    'IP_ADDRESS_IN_URL', 'AT_SYMBOL_IN_URL', 'URL_SHORTENER_DETECTED'
  ]);

  if (findings.length > 0) {
    findingsSection.style.display = 'block';
    findings.forEach(f => {
      const chip = document.createElement('span');
      chip.className = dangerFindings.has(f) ? 'finding-chip' : 'finding-chip warning-chip';
      chip.textContent = f.replace(/_/g, ' ');
      findingsList.appendChild(chip);
    });
  }

  // Populate message
  if (message) {
    messageEl.textContent = message;
  } else if (!isHighThreat) {
    messageEl.textContent = 'This website has a risk score of ' + score + '/100 (Suspicious, 20–60 range) and requires your review before proceeding. Do you want to continue?';
  } else {
    messageEl.textContent = 'This website has a risk score of ' + score + '/100 (>60 high threat) and was blocked to protect your credentials. Proceed with extreme caution.';
  }

  // Button handlers
  const btnBlock = document.getElementById('btn-block');
  const btnContinue = document.getElementById('btn-continue');

  // Go Back — navigate back or close tab
  btnBlock.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Try to close the tab, or navigate to a safe page
      window.close();
      // Fallback if window.close() doesn't work
      setTimeout(() => {
        window.location.href = 'about:blank';
      }, 100);
    }
  });

  // Continue at own risk — send bypass message and navigate
  btnContinue.addEventListener('click', async () => {
    if (!destinationUrl) return;

    // Confirm intention
    btnContinue.textContent = 'Proceeding...';
    btnContinue.disabled = true;

    try {
      // Tell background script to bypass this URL
      await chrome.runtime.sendMessage({
        type: 'BYPASS_URL',
        url: destinationUrl
      });

      // Navigate to the original URL
      window.location.href = destinationUrl;
    } catch {
      // If messaging fails, still allow navigation
      window.location.href = destinationUrl;
    }
  });
})();
