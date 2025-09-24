/**
 * lolnuked StreamGuard - Auto Replies Management
 *
 * Created by: Daniel "CEO of the XRPL" Keller
 * Twitter/X: @daniel_wwf (https://x.com/daniel_wwf)
 *
 * ATTRIBUTION REQUIRED: This attribution MUST NOT be removed.
 */

const K_AUTO_REPLIES = "pfam_auto_replies";
const K_AUTO_REPLY_ENABLED = "pfam_auto_reply_enabled";
const K_ACTION = "pfam_action";

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

let autoReplies = [];
let isAutoReplyEnabled = false;

// Default auto reply examples
const defaultReplies = [
  { trigger: "twitter", reply: "@boudy_08" },
  { trigger: "telegram", reply: "Join our TG: t.me/yourchannel" },
  { trigger: "how*buy", reply: "You can buy on pump.fun or dexscreener" }
];

function load() {
  chrome.storage.sync.get({
    [K_AUTO_REPLIES]: "[]",
    [K_AUTO_REPLY_ENABLED]: false,
    [K_ACTION]: "viewer_mode"
  }, (res) => {
    try {
      autoReplies = JSON.parse(res[K_AUTO_REPLIES] || "[]");
      isAutoReplyEnabled = res[K_AUTO_REPLY_ENABLED] || res[K_ACTION] === "auto_reply";

      // Update toggle state
      $("#auto-reply-enabled").checked = isAutoReplyEnabled;

      if (autoReplies.length === 0) {
        $("#empty-state").style.display = "block";
      } else {
        $("#empty-state").style.display = "none";
      }
      renderPresets();
    } catch (error) {
      console.error("Error loading auto replies:", error);
      autoReplies = [];
      renderPresets();
    }
  });
}

function renderPresets() {
  const container = $("#presets-container");
  container.innerHTML = "";

  if (autoReplies.length === 0) {
    $("#empty-state").style.display = "block";
    return;
  }

  $("#empty-state").style.display = "none";

  autoReplies.forEach((preset, index) => {
    const presetElement = createPresetElement(preset, index);
    container.appendChild(presetElement);
  });
}

function createPresetElement(preset, index) {
  const div = document.createElement("div");
  const isNew = !preset.trigger && !preset.reply;
  div.className = isNew ? "preset-item" : "preset-item collapsed";
  div.dataset.index = index;
  div.innerHTML = `
    <div class="preset-header">
      <div class="preset-preview">
        <div class="preset-trigger-preview">${preset.trigger || 'New Trigger'}</div>
        <div>→</div>
        <div class="preset-reply-preview">${preset.reply || 'New Reply'}</div>
      </div>
      <div class="preset-arrow">▼</div>
    </div>
    <div class="preset-content">
      <div class="preset-row">
        <div style="flex: 1;">
          <div class="preset-label">Trigger Message</div>
          <input type="text" class="preset-input trigger-input"
                 placeholder="e.g., twitter, how*buy, exact:gm"
                 value="${escapeHtml(preset.trigger)}">
        </div>
      </div>
      <div class="preset-row">
        <div style="flex: 1;">
          <div class="preset-label">Auto Reply</div>
          <input type="text" class="preset-input reply-input"
                 placeholder="e.g., @boudy_08, Check our website: example.com"
                 value="${escapeHtml(preset.reply)}">
        </div>
      </div>
      <div class="preset-actions">
        <button class="save-preset-btn">💾 Save</button>
        <button class="remove-btn">🗑️ Remove</button>
      </div>
    </div>
  `;

  // Add event listeners
  const header = div.querySelector('.preset-header');
  const triggerInput = div.querySelector('.trigger-input');
  const replyInput = div.querySelector('.reply-input');
  const saveBtn = div.querySelector('.save-preset-btn');
  const removeBtn = div.querySelector('.remove-btn');

  // Header click to toggle
  header.addEventListener('click', () => {
    div.classList.toggle('collapsed');
  });

  // Input changes
  triggerInput.addEventListener('input', (e) => {
    autoReplies[index].trigger = e.target.value;
    updatePresetPreview(index);
  });

  replyInput.addEventListener('input', (e) => {
    autoReplies[index].reply = e.target.value;
    updatePresetPreview(index);
  });

  // Button clicks
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    saveIndividualPreset(index);
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmRemovePreset(index);
  });

  return div;
}


// Update preset preview text
function updatePresetPreview(index) {
  const preset = document.querySelector(`[data-index="${index}"]`);
  if (preset) {
    const triggerPreview = preset.querySelector('.preset-trigger-preview');
    const replyPreview = preset.querySelector('.preset-reply-preview');

    triggerPreview.textContent = autoReplies[index].trigger || 'New Trigger';
    replyPreview.textContent = autoReplies[index].reply || 'New Reply';
  }
}

// Save individual preset
function saveIndividualPreset(index) {
  const preset = autoReplies[index];
  if (!preset.trigger.trim() || !preset.reply.trim()) {
    showStatus('Please fill both trigger and reply fields!', 'error');
    return;
  }

  // Collapse the preset after saving
  const presetElement = document.querySelector(`[data-index="${index}"]`);
  if (presetElement) {
    presetElement.classList.add('collapsed');
  }

  // Show success message
  showStatus('Preset saved! Remember to click "Save Auto Replies" to persist all changes.', 'success');
  updatePresetPreview(index);
}

// Custom confirmation modal
function showConfirmModal(title, message, onConfirm) {
  const modal = $('#modal-overlay');
  const modalTitle = $('#modal-title');
  const modalMessage = $('#modal-message');
  const confirmBtn = $('#modal-confirm');
  const cancelBtn = $('#modal-cancel');

  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modal.style.display = 'flex';

  // Remove existing event listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  // Add new event listeners
  newConfirmBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    onConfirm();
  });

  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

// Confirm remove preset
function confirmRemovePreset(index) {
  const preset = autoReplies[index];
  const triggerText = preset.trigger || 'New Trigger';

  showConfirmModal(
    'Remove Auto Reply',
    `Are you sure you want to remove "${triggerText}" → "${preset.reply || 'New Reply'}"?`,
    () => removePreset(index)
  );
}

function addPreset() {
  autoReplies.push({ trigger: "", reply: "" });
  renderPresets();

  // Focus on the new trigger input (last one, which should be expanded)
  setTimeout(() => {
    const newIndex = autoReplies.length - 1;
    const newPreset = document.querySelector(`[data-index="${newIndex}"]`);
    if (newPreset) {
      const triggerInput = newPreset.querySelector('.trigger-input');
      if (triggerInput) {
        triggerInput.focus();
      }
    }
  }, 100);
}

function removePreset(index) {
  if (confirm("Remove this auto reply preset?")) {
    autoReplies.splice(index, 1);
    renderPresets();
  }
}

function saveAutoReplies() {
  // Validate and clean up auto replies
  const validReplies = autoReplies.filter(preset => {
    return preset.trigger.trim() && preset.reply.trim();
  }).map(preset => ({
    trigger: preset.trigger.trim(),
    reply: preset.reply.trim()
  }));

  // Update the array with clean data
  autoReplies = validReplies;

  // Save to storage
  chrome.storage.sync.set({
    [K_AUTO_REPLIES]: JSON.stringify(validReplies)
  }, () => {
    showStatus("Auto replies saved successfully!", "success");

    // Notify content script that auto replies updated
    chrome.tabs?.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs?.sendMessage(tabs[0].id, {
          action: "autoRepliesUpdated"
        }, () => {
          // Clear any Chrome runtime errors
          if (chrome.runtime.lastError) {
            console.log("Could not send autoRepliesUpdated message:", chrome.runtime.lastError.message);
          }
        });
      }
    });

    renderPresets();
  });
}

function resetAutoReplies() {
  showConfirmModal(
    'Clear All Auto Replies',
    'This will remove all auto reply presets. Are you sure?',
    () => {
      autoReplies = [];
      chrome.storage.sync.set({
        [K_AUTO_REPLIES]: "[]"
      }, () => {
        showStatus("Auto replies cleared!", "success");
        renderPresets();
      });
    }
  );
}

function loadDefaults() {
  if (confirm("This will replace all current auto replies with examples. Continue?")) {
    autoReplies = [...defaultReplies];
    renderPresets();
    showStatus("Default examples loaded! Don't forget to save.", "success");
  }
}

function showStatus(message, type) {
  const statusEl = $("#status-msg");
  statusEl.textContent = message;
  statusEl.className = `status-msg status-${type}`;
  statusEl.style.display = "block";

  setTimeout(() => {
    statusEl.style.display = "none";
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function bind() {
  $("#back-btn").addEventListener("click", () => {
    window.close();
  });

  $("#auto-reply-enabled").addEventListener("change", (e) => {
    isAutoReplyEnabled = e.target.checked;

    // Update action mode based on toggle
    if (isAutoReplyEnabled) {
      chrome.storage.sync.set({
        [K_AUTO_REPLY_ENABLED]: true,
        [K_ACTION]: "auto_reply"
      });
    } else {
      chrome.storage.sync.set({
        [K_AUTO_REPLY_ENABLED]: false,
        [K_ACTION]: "viewer_mode"
      });
    }

    // Notify content script
    chrome.tabs?.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs?.sendMessage(tabs[0].id, {
          action: "autoReplyToggled",
          enabled: isAutoReplyEnabled
        });
      }
    });
  });

  $("#add-preset-btn").addEventListener("click", addPreset);
  $("#save-btn").addEventListener("click", saveAutoReplies);
  $("#reset-btn").addEventListener("click", resetAutoReplies);

  // Handle keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 's') {
        e.preventDefault();
        saveAutoReplies();
      }
    }
  });
}

// Make functions global for onclick handlers (only the ones we still use)
window.updatePresetPreview = updatePresetPreview;
window.saveIndividualPreset = saveIndividualPreset;
window.confirmRemovePreset = confirmRemovePreset;

document.addEventListener("DOMContentLoaded", () => {
  load();
  bind();
});