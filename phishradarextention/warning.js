// PhishRadar Warning Page
// Score tiers: <20 safe (no block), 20-59 suspicious, 60+ high risk

(function () {
  'use strict';

  // ── Read URL params ────────────────────────────────────────────────────
  const p = new URLSearchParams(window.location.search);
  const destinationUrl = p.get('url')         || '';
  const finalresult    = p.get('finalresult')  || '';
  const risckscore     = p.get('risckscore')   || '0';
  const risklevel      = p.get('risklevel')    || '';
  const message        = p.get('message')      || '';
  const mlresult       = p.get('mlresult')     || '';
  const regexresult    = p.get('regexresult')  || '';
  const actiontaken    = p.get('actiontaken')  || '';
  const explanationsRaw = p.get('explanations') || '';
  const findingsRaw    = p.get('findings')     || '';

  let explanations = [];
  try {
    if (explanationsRaw) explanations = JSON.parse(explanationsRaw);
  } catch {}
  let findings = [];
  try {
    if (findingsRaw) findings = JSON.parse(findingsRaw);
  } catch {}

  const score = parseInt(risckscore, 10) || 0;

  // ── Determine tier ─────────────────────────────────────────────────────
  const isHighRisk = score >= 60
    || finalresult === 'SUSPICIOUS'
    || actiontaken === 'WARNING';

  const isSuspicious = !isHighRisk && (
    score >= 20
    || finalresult === 'REVIEW'
    || actiontaken === 'REVIEW'
  );

  // ── Update icon colour for suspicious tier ─────────────────────────────
  if (isSuspicious) {
    const iconWrap = document.querySelector('.icon-wrap');
    if (iconWrap) iconWrap.classList.add('warn');
  }

  // ── Heading & description ──────────────────────────────────────────────
  const heading = document.getElementById('main-heading');
  const desc    = document.getElementById('main-desc');

  if (heading) {
    heading.textContent = isHighRisk
      ? 'Dangerous site blocked'
      : 'Suspicious site — proceed with caution';
  }

  if (desc) {
    desc.textContent = isHighRisk
      ? 'PhishRadar blocked this page because it shows strong signs of phishing or credential theft. We recommend you go back.'
      : 'This site has a suspicious risk score (' + score + '/100). It may not be safe. Review the details below before deciding.';
  }

  // ── URL display ────────────────────────────────────────────────────────
  const urlBox = document.getElementById('url-box');
  if (urlBox && destinationUrl) {
    urlBox.textContent = destinationUrl.length > 120
      ? destinationUrl.substring(0, 120) + '…'
      : destinationUrl;
  }

  // ── Helper: colour a value element ────────────────────────────────────
  function setVal(id, text, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text || '—';
    if (typeof cls === 'string') {
      const cleanCls = cls.trim();
      if (cleanCls.length > 0 && !/\s/.test(cleanCls)) {
        el.classList.add(cleanCls);
      }
    }
  }

  function verdictColor(v) {
    if (!v) return '';
    v = v.toUpperCase();
    if (v === 'SUSPICIOUS' || v === 'PHISHING') return 'red';
    if (v === 'REVIEW') return 'yellow';
    return 'green';
  }

  function risklevelColor(v) {
    if (!v) return '';
    v = v.toUpperCase();
    if (v === 'HIGH') return 'red';
    if (v === 'MEDIUM') return 'yellow';
    return 'green';
  }

  // ── Fill detail table ──────────────────────────────────────────────────
  const verdictText = finalresult || (isHighRisk ? 'SUSPICIOUS' : 'REVIEW');
  setVal('d-verdict', verdictText, verdictColor(verdictText));
  setVal('d-score',   score + ' / 100', score >= 60 ? 'red' : score >= 20 ? 'yellow' : 'green');
  setVal('d-level',   risklevel || (isHighRisk ? 'HIGH' : 'MEDIUM'), risklevelColor(risklevel || (isHighRisk ? 'HIGH' : 'MEDIUM')));
  if (mlresult)    setVal('d-ml',    mlresult,    mlresult.toUpperCase()    === 'PHISHING'   ? 'red' : 'green');
  if (regexresult) setVal('d-regex', regexresult, regexresult.toUpperCase() === 'SUSPICIOUS' ? 'yellow' : 'green');

  // ── Warning message ────────────────────────────────────────────────────
  const msgEl = document.getElementById('warning-msg');
  if (msgEl) {
    msgEl.textContent = message
      || (isHighRisk
        ? 'Phishing or malware indicators detected. Risk score: ' + score + '/100. Accessing this page may compromise your accounts or device.'
        : 'Risk score: ' + score + '/100. This site has characteristics matching known suspicious patterns. Verify the site before entering any sensitive information.');
  }

  // ── Render Explanations / Threat Indicators ────────────────────────────
  const reasonsContainer = document.getElementById('reasons-container');
  const reasonsList = document.getElementById('reasons-list');
  const allReasons = [];

  if (Array.isArray(explanations) && explanations.length > 0) {
    explanations.forEach(r => allReasons.push(String(r)));
  }
  if (Array.isArray(findings) && findings.length > 0) {
    findings.forEach(f => {
      const friendlyFinding = f.replace(/_/g, ' ').toLowerCase();
      const formatted = friendlyFinding.charAt(0).toUpperCase() + friendlyFinding.slice(1);
      if (!allReasons.includes(formatted)) {
        allReasons.push(formatted);
      }
    });
  }

  if (reasonsContainer && reasonsList && allReasons.length > 0) {
    reasonsContainer.style.display = 'block';
    reasonsList.innerHTML = '';
    allReasons.slice(0, 5).forEach(reason => {
      const li = document.createElement('li');
      li.textContent = reason;
      reasonsList.appendChild(li);
    });
  }

  // ── GO BACK BUTTON ─────────────────────────────────────────────────────
  // Strategy: send message to background → background navigates tab to newtab.
  // Fallback 1: window.close()
  // Fallback 2: about:blank
  // (We do NOT use window.history.back() because that causes a re-scan loop.)
  document.getElementById('btn-back').addEventListener('click', function () {
    this.disabled  = true;
    this.textContent = 'Going back...';

    // Ask background to navigate this tab away
    try {
      chrome.runtime.sendMessage({ type: 'GO_BACK_TO_SAFETY' }, function () {
        // Background handled it; if we're still here after 600ms use fallbacks
        setTimeout(function () {
          if (!window.closed) {
            if (!window.close()) {
              window.location.replace('about:blank');
            }
          }
        }, 600);
      });
    } catch (e) {
      // runtime not available (shouldn't happen in extension page, but just in case)
      window.location.replace('about:blank');
    }
  });

  // ── CONTINUE BUTTON ────────────────────────────────────────────────────
  document.getElementById('btn-continue').addEventListener('click', function () {
    if (!destinationUrl) return;
    this.disabled  = true;
    this.textContent = 'Opening...';

    // Register bypass so background doesn't re-intercept this URL
    try {
      chrome.runtime.sendMessage({ type: 'BYPASS_URL', url: destinationUrl }, function () {
        window.location.href = destinationUrl;
      });
    } catch (e) {
      window.location.href = destinationUrl;
    }
  });

})();
