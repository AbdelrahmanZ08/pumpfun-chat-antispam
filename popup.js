/**
 * lolnuked StreamGuard - Popup Interface
 * 
 * Created by: Daniel "CEO of the XRPL" Keller
 * Twitter/X: @daniel_wwf (https://x.com/daniel_wwf)
 * 
 * ATTRIBUTION REQUIRED: This attribution MUST NOT be removed.
 */

// Popup settings glue
const K_ENABLED = "pfam_enabled";
const K_ACTION  = "pfam_action";       // "highlight" | "delete_ui" | "ban_ui"
const K_DELAY   = "pfam_delay_ms";
const K_REASON  = "pfam_ban_reason";

const defaults = {
  [K_ENABLED]: true,
  [K_ACTION]: "viewer_mode",
  [K_DELAY]: 200,  // 0.2 seconds default for ban/delete modes
  [K_REASON]: "Spam"
};

const $ = sel => document.querySelector(sel);

function load() {
  chrome.storage.sync.get(defaults, res => {
    $("#enabled").checked = !!res[K_ENABLED];
    $("#action").value    = res[K_ACTION];
    $("#delay").value     = String(res[K_DELAY]);
    $("#reason").value    = res[K_REASON];
    
    // Set delay visibility based on the LOADED action value (not HTML default)
    updateDelayVisibility(res[K_ACTION]);
  });
  
  // Load tab status
  loadTabStatus();
}

function bind() {
  $("#enabled").addEventListener("change", e => {
    chrome.storage.sync.set({ [K_ENABLED]: e.target.checked });
  });
  $("#action").addEventListener("change", e => {
    chrome.storage.sync.set({ [K_ACTION]: e.target.value });
    
    // Hide delay setting for viewer mode (it's instant)
    updateDelayVisibility(e.target.value);
  });
  $("#delay").addEventListener("change", e => {
    chrome.storage.sync.set({ [K_DELAY]: Number(e.target.value) });
  });
  $("#reason").addEventListener("change", e => {
    chrome.storage.sync.set({ [K_REASON]: e.target.value });
  });
  
  // Force activate button
  $("#force-activate").addEventListener("click", () => {
    chrome.tabs?.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || !tabs[0]) return;
      
      chrome.tabs?.sendMessage(tabs[0].id, {action: "forceActivate"}, () => {
        // Clear any Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.log("Could not send forceActivate message:", chrome.runtime.lastError.message);
          return;
        }
        
        // Reload status after activation
        setTimeout(loadTabStatus, 500);
      });
    });
  });
  
  // Manage triggers button
  $("#manage-triggers").addEventListener("click", () => {
    chrome.windows?.create({
      url: "triggers.html",
      type: "popup",
      width: 450,
      height: 500
    });
  });

  // Manage auto replies button
  $("#manage-replies").addEventListener("click", () => {
    chrome.windows?.create({
      url: "auto-replies.html",
      type: "popup",
      width: 520,
      height: 600
    });
  });
}

function loadTabStatus() {
  chrome.tabs?.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs || !tabs[0]) {
      $("#tab-text").textContent = "No active tab";
      return;
    }
    
    chrome.tabs?.sendMessage(tabs[0].id, {action: "getTabStatus"}, (response) => {
      // Clear any Chrome runtime errors
      if (chrome.runtime.lastError) {
        // Content script not loaded or not on pump.fun
        $("#tab-text").textContent = "Not on pump.fun or extension not loaded";
        return;
      }
      
      if (response) {
        updateTabStatusUI(response.isActive, response.tabId);
      } else {
        // Fallback if content script not ready
        $("#tab-text").textContent = "Extension loading...";
      }
    });
  });
}

function updateTabStatusUI(isActive, tabId) {
  const indicator = $("#tab-indicator");
  const text = $("#tab-text");
  const button = $("#force-activate");
  
  if (isActive) {
    indicator.textContent = "🟢";
    text.textContent = "Active on this tab";
    button.style.display = "none";
  } else {
    indicator.textContent = "⚪";
    text.textContent = "Inactive (dormant)";
    button.style.display = "block";
  }
}

function updateDelayVisibility(actionMode) {
  const delayRow = $("#delay-row");
  const delayMessage = $("#delay-message");

  if (actionMode === "viewer_mode" || actionMode === "auto_reply") {
    // Show message for viewer mode and auto-reply mode (no delay options)
    delayRow.style.display = "none";
    delayMessage.style.display = "flex";

    // Update message text based on mode
    const infoText = delayMessage.querySelector(".info-text");
    if (actionMode === "auto_reply") {
      infoText.textContent = "Auto replies have built-in delays";
    } else {
      infoText.textContent = "No delay options (instant hiding)";
    }
  } else {
    // Show delay selector for other modes
    delayRow.style.display = "flex";
    delayMessage.style.display = "none";
  }
}

// Copy to clipboard function
function copyToClipboard(text) {
  // Try modern clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showCopyNotification('Address copied!');
    }).catch(err => {
      console.error('Clipboard API failed:', err);
      fallbackCopyText(text);
    });
  } else {
    // Fallback for older browsers or non-secure contexts
    fallbackCopyText(text);
  }
}

// Fallback copy method using selection
function fallbackCopyText(text) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    textArea.remove();

    if (successful) {
      showCopyNotification('Address copied!');
    } else {
      showCopyNotification('Copy failed - please select manually', 'error');
    }
  } catch (err) {
    console.error('Fallback copy failed:', err);
    showCopyNotification('Copy failed - please select manually', 'error');
  }
}

// Show copy notification
function showCopyNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = 'copy-notification';
  notification.textContent = type === 'success' ? '📋 ' + message : '❌ ' + message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Make function global
window.copyToClipboard = copyToClipboard;

document.addEventListener("DOMContentLoaded", () => {
  load(); bind();
});
