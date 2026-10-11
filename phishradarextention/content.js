// PhishRadar Content Script
// Passive observer - does not interfere with normal browser navigation

(function () {
  'use strict';

  // Do not run on internal extension pages
  if (window.location.protocol === 'chrome-extension:' || window.location.protocol === 'chrome:') {
    return;
  }

  // Content script is available for DOM inspection and communication if needed
})();
