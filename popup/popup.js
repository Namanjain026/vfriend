/**
 * Virtual Friend — Popup Logic
 * Binds UI inputs to chrome.storage.local, handles custom character file uploads,
 * and updates badge states.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statusBadge = document.getElementById('statusBadge');
  const enabledToggle = document.getElementById('enabledToggle');
  const privacyToggle = document.getElementById('privacyToggle');
  
  const avatarTypeGroup = document.getElementById('avatarTypeGroup');
  const customAvatarInput = document.getElementById('customAvatarInput');
  const resetAvatarBtn = document.getElementById('resetAvatarBtn');
  const uploadPreviewContainer = document.getElementById('uploadPreviewContainer');
  const uploadPreviewImg = document.getElementById('uploadPreviewImg');

  const sizeGroup = document.getElementById('sizeGroup');
  const positionGroup = document.getElementById('positionGroup');
  const opacityRange = document.getElementById('opacityRange');
  const opacityVal = document.getElementById('opacityVal');
  
  const frequencyGroup = document.getElementById('frequencyGroup');
  const frameIntervalSelect = document.getElementById('frameIntervalSelect');
  const videoAwareToggle = document.getElementById('videoAwareToggle');
  const interactionToggle = document.getElementById('interactionToggle');
  const optionsLink = document.getElementById('optionsLink');

  // Adjust shortcut badge text based on OS
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  document.getElementById('shortcutKbd').textContent = isMac ? '⌘+Shift+P' : 'Ctrl+Shift+P';

  // Load existing settings
  chrome.storage.local.get(null, (settings) => {
    if (!settings) return;

    enabledToggle.checked = settings.enabled !== false;
    privacyToggle.checked = !!settings.privacyMode;

    const charType = settings.characterType || 'anime_image';
    setActivePill(avatarTypeGroup, charType);

    if (settings.customCharacterDataUrl) {
      uploadPreviewImg.src = settings.customCharacterDataUrl;
      uploadPreviewContainer.style.display = 'flex';
    } else {
      uploadPreviewContainer.style.display = 'none';
    }

    setActivePill(sizeGroup, settings.size || 'medium');
    setActiveCorner(positionGroup, settings.position || 'bottom-right');

    const opVal = settings.opacity !== undefined ? settings.opacity : 1.0;
    opacityRange.value = opVal;
    opacityVal.textContent = `${Math.round(opVal * 100)}%`;

    setActivePill(frequencyGroup, settings.animationFrequency || 'normal');
    if (frameIntervalSelect) {
      frameIntervalSelect.value = settings.frameInterval || '3s';
    }
    videoAwareToggle.checked = settings.videoAwarenessEnabled !== false;
    interactionToggle.checked = settings.interactionEnabled !== false;

    updateStatusBadge(enabledToggle.checked, privacyToggle.checked);
  });

  // Event Listeners

  enabledToggle.addEventListener('change', (e) => {
    const val = e.target.checked;
    chrome.storage.local.set({ enabled: val });
    updateStatusBadge(val, privacyToggle.checked);
  });

  privacyToggle.addEventListener('change', (e) => {
    const val = e.target.checked;
    chrome.storage.local.set({ privacyMode: val });
    updateStatusBadge(enabledToggle.checked, val);
  });

  // Avatar Type Pill Selector
  avatarTypeGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (btn) {
      const val = btn.dataset.value;
      setActivePill(avatarTypeGroup, val);
      chrome.storage.local.set({ characterType: val });
    }
  });

  // Custom Image Upload Listener
  customAvatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 350x350 to optimize storage space
        const canvas = document.createElement('canvas');
        const maxDim = 350;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png');

        chrome.storage.local.set({
          customCharacterDataUrl: dataUrl,
          characterType: 'custom_image'
        }, () => {
          uploadPreviewImg.src = dataUrl;
          uploadPreviewContainer.style.display = 'flex';
          setActivePill(avatarTypeGroup, 'custom_image');
        });
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Reset Custom Image
  resetAvatarBtn.addEventListener('click', () => {
    chrome.storage.local.remove('customCharacterDataUrl');
    chrome.storage.local.set({ characterType: 'anime_image' }, () => {
      uploadPreviewContainer.style.display = 'none';
      uploadPreviewImg.src = '';
      customAvatarInput.value = '';
      setActivePill(avatarTypeGroup, 'anime_image');
    });
  });

  // Pill group delegation (Size & Frequency)
  sizeGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (btn) {
      const val = btn.dataset.value;
      setActivePill(sizeGroup, val);
      chrome.storage.local.set({ size: val });
    }
  });

  frequencyGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (btn) {
      const val = btn.dataset.value;
      setActivePill(frequencyGroup, val);
      chrome.storage.local.set({ animationFrequency: val });
    }
  });

  if (frameIntervalSelect) {
    frameIntervalSelect.addEventListener('change', (e) => {
      chrome.storage.local.set({ frameInterval: e.target.value });
    });
  }

  // Position Grid
  positionGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.corner-btn');
    if (btn) {
      const val = btn.dataset.value;
      setActiveCorner(positionGroup, val);
      chrome.storage.local.set({ position: val });
    }
  });

  // Opacity Slider
  opacityRange.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    opacityVal.textContent = `${Math.round(val * 100)}%`;
    chrome.storage.local.set({ opacity: val });
  });

  // Video & Interaction Toggles
  videoAwareToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ videoAwarenessEnabled: e.target.checked });
  });

  interactionToggle.addEventListener('change', (e) => {
    chrome.storage.local.set({ interactionEnabled: e.target.checked });
  });

  // Options page link
  optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });

  // Helper Functions
  function updateStatusBadge(enabled, privacy) {
    if (privacy) {
      statusBadge.textContent = 'Privacy Focus';
      statusBadge.className = 'status-badge privacy';
    } else if (enabled) {
      statusBadge.textContent = 'Active';
      statusBadge.className = 'status-badge';
    } else {
      statusBadge.textContent = 'Disabled';
      statusBadge.className = 'status-badge disabled';
    }
  }

  function setActivePill(groupEl, value) {
    const buttons = groupEl.querySelectorAll('.pill-btn');
    buttons.forEach((btn) => {
      if (btn.dataset.value === value) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function setActiveCorner(groupEl, value) {
    const buttons = groupEl.querySelectorAll('.corner-btn');
    buttons.forEach((btn) => {
      if (btn.dataset.value === value) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
});
