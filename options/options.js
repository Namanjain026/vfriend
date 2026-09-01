/**
 * Virtual Friend — Options Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const defaultPosition = document.getElementById('defaultPosition');
  const defaultSize = document.getElementById('defaultSize');
  const resetBtn = document.getElementById('resetBtn');

  // Load options
  chrome.storage.local.get(['position', 'size'], (res) => {
    if (res.position) defaultPosition.value = res.position;
    if (res.size) defaultSize.value = res.size;
  });

  defaultPosition.addEventListener('change', (e) => {
    chrome.storage.local.set({ position: e.target.value });
  });

  defaultSize.addEventListener('change', (e) => {
    chrome.storage.local.set({ size: e.target.value });
  });

  resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all Virtual Friend settings to defaults?')) {
      chrome.storage.local.set({
        enabled: true,
        privacyMode: false,
        characterType: "anime_image",
        customCharacterDataUrl: null,
        size: "medium",
        position: "bottom-right",
        opacity: 1.0,
        soundsEnabled: false,
        volume: 0.5,
        animationFrequency: "normal",
        videoAwarenessEnabled: true,
        interactionEnabled: true
      }, () => {
        defaultPosition.value = "bottom-right";
        defaultSize.value = "medium";
        alert('Virtual Friend settings reset to default!');
      });
    }
  });
});
