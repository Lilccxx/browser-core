import { registerContentScript, CHROME_MSG_SOURCE, isCliqzContentScriptMsg } from '../core/content/helpers';
import platform from '../platform/platform'
import config from '../core/config';

registerContentScript('http*', (window, chrome, windowId) => {
  let url = window.location.href;

  // do not check for iframes
  if (window.parent && window.parent === window) {
    let payload = {
      module: 'anti-phishing',
      action: 'isPhishingURL',
      args: [url]
    }

    chrome.runtime.sendMessage( {
      source: CHROME_MSG_SOURCE,
      windowId,
      payload
    })
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!isCliqzContentScriptMsg(msg)) {
      return;
    }

    let WARNINGURL = `chrome://cliqz/content/anti-phishing/phishing-warning.html?u=`;
    // On chromium platform the windowid is a fake on (always === 1),
    // instead the message is sent to the tab through `tabs.sendMessage`
    const sameSourceWindow = msg.windowId === windowId || platform.isChromium;
    if (sameSourceWindow) {
      if (msg && msg.response && msg.response.type === 'phishingURL') {
        if (msg.response.block) {
          if (!platform.isChromium) {
            window.location = WARNINGURL + encodeURIComponent(window.location);
          }
        }
      }
    }
  });
})
