/**
 * Virtual Friend — Main Content Script
 * Bootstraps Shadow DOM overlay, connects Animation Engine, State Machine, and Site Detector.
 */

(function () {
  // Prevent duplicate instantiation
  if (window.__virtualFriendInjected) return;
  window.__virtualFriendInjected = true;

  class VirtualFriendOverlay {
    constructor() {
      this.settings = {
        enabled: true,
        privacyMode: false,
        characterType: "anime_image",
        customCharacterDataUrl: null,
        size: "medium",
        position: "bottom-right",
        opacity: 1.0,
        animationFrequency: "normal",
        frameInterval: "3s",
        videoAwarenessEnabled: true,
        interactionEnabled: true
      };

      this.hostEl = null;
      this.shadowRoot = null;
      this.wrapperEl = null;
      this.speechBubbleEl = null;
      this.canvasEl = null;

      this.animationEngine = null;
      this.stateMachine = null;
      this.siteDetector = null;

      this.init();
    }

    async init() {
      await this.loadSettings();
      this.createShadowDOM();
      this.initEngine();
      this.bindListeners();
      this.applySettings();
    }

    loadSettings() {
      return new Promise((resolve) => {
        chrome.storage.local.get(null, (res) => {
          if (res && Object.keys(res).length > 0) {
            this.settings = { ...this.settings, ...res };
          }
          resolve();
        });
      });
    }

    createShadowDOM() {
      // 1. Host element
      this.hostEl = document.createElement('div');
      this.hostEl.id = 'virtual-friend-host';

      // 2. Attach Closed Shadow Root for isolation
      this.shadowRoot = this.hostEl.attachShadow({ mode: 'closed' });

      // 3. Inlined CSS for zero-latency instant layout
      const styleTag = document.createElement('style');
      styleTag.textContent = `
        :host { all: initial !important; box-sizing: border-box !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }
        #vf-wrapper { position: fixed !important; z-index: 2147483647 !important; pointer-events: none !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: flex-end !important; transition: opacity 0.3s ease, transform 0.3s ease !important; user-select: none !important; }
        #vf-wrapper.pos-bottom-right { bottom: 24px !important; right: 24px !important; }
        #vf-wrapper.pos-bottom-left { bottom: 24px !important; left: 24px !important; }
        #vf-wrapper.pos-top-right { top: 24px !important; right: 24px !important; }
        #vf-wrapper.pos-top-left { top: 24px !important; left: 24px !important; }
        #vf-wrapper.size-small { width: 135px !important; height: 135px !important; }
        #vf-wrapper.size-medium { width: 195px !important; height: 195px !important; }
        #vf-wrapper.size-large { width: 270px !important; height: 270px !important; }
        #vf-wrapper.size-xlarge { width: 360px !important; height: 360px !important; }
        #vf-wrapper.size-xxlarge { width: 450px !important; height: 450px !important; }
        #vf-wrapper.is-hidden, #vf-wrapper.privacy-active { opacity: 0 !important; transform: scale(0.85) translateY(12px) !important; pointer-events: none !important; }
        #vf-speech-bubble { position: absolute !important; bottom: 100% !important; left: 50% !important; margin-bottom: 12px !important; background: rgba(17, 24, 39, 0.92) !important; color: #f3f4f6 !important; backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important; border: 1.5px solid rgba(255, 255, 255, 0.2) !important; border-radius: 16px !important; padding: 10px 16px !important; font-weight: 700 !important; white-space: pre-line !important; word-wrap: break-word !important; overflow-wrap: break-word !important; text-align: center !important; line-height: 1.35 !important; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important; opacity: 0 !important; transform: translateX(-50%) translateY(6px) scale(0.9) !important; transition: opacity 0.25s ease, transform 0.25s ease !important; pointer-events: none !important; box-sizing: border-box !important; width: max-content !important; max-width: 250px !important; }
        #vf-speech-bubble.visible { opacity: 1 !important; transform: translateX(-50%) translateY(0) scale(1) !important; }
        #vf-speech-bubble::after { content: "" !important; position: absolute !important; top: 100% !important; left: 50% !important; transform: translateX(-50%) !important; border-width: 7px !important; border-style: solid !important; border-color: rgba(17, 24, 39, 0.92) transparent transparent transparent !important; }
        #vf-wrapper.size-small #vf-speech-bubble { font-size: 13px !important; padding: 8px 12px !important; max-width: 190px !important; margin-bottom: 8px !important; }
        #vf-wrapper.size-medium #vf-speech-bubble { font-size: 15px !important; padding: 10px 16px !important; max-width: 240px !important; margin-bottom: 12px !important; }
        #vf-wrapper.size-large #vf-speech-bubble { font-size: 18px !important; padding: 12px 18px !important; max-width: 300px !important; margin-bottom: 14px !important; border-radius: 18px !important; }
        #vf-wrapper.size-xlarge #vf-speech-bubble { font-size: 21px !important; padding: 14px 22px !important; max-width: 360px !important; margin-bottom: 16px !important; border-radius: 20px !important; }
        #vf-wrapper.size-xxlarge #vf-speech-bubble { font-size: 24px !important; padding: 16px 26px !important; max-width: 420px !important; margin-bottom: 18px !important; border-radius: 22px !important; }
        #vf-character-container { width: 100% !important; height: 100% !important; position: relative !important; pointer-events: auto !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; }
        #vf-canvas { width: 100% !important; height: 100% !important; display: block !important; object-fit: contain !important; filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.25)) !important; }
        #vf-character-container:hover #vf-canvas { transform: translateY(-2px) scale(1.02) !important; transition: transform 0.2s ease !important; }
      `;
      this.shadowRoot.appendChild(styleTag);

      // 4. Inject CSS Stylesheet link as fallback
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = chrome.runtime.getURL('content/friend.css');
      this.shadowRoot.appendChild(styleLink);

      // 5. Construct DOM tree
      this.wrapperEl = document.createElement('div');
      this.wrapperEl.id = 'vf-wrapper';

      this.speechBubbleEl = document.createElement('div');
      this.speechBubbleEl.id = 'vf-speech-bubble';
      this.speechBubbleEl.textContent = 'Hello!';

      const characterContainer = document.createElement('div');
      characterContainer.id = 'vf-character-container';

      this.canvasEl = document.createElement('canvas');
      this.canvasEl.id = 'vf-canvas';

      characterContainer.appendChild(this.canvasEl);
      this.wrapperEl.appendChild(this.speechBubbleEl);
      this.wrapperEl.appendChild(characterContainer);
      this.shadowRoot.appendChild(this.wrapperEl);

      // 6. Append host to main page body
      (document.body || document.documentElement).appendChild(this.hostEl);
    }

    initEngine() {
      // Initialize Animation Engine & State Machine
      this.animationEngine = new window.VirtualFriendAnimationEngine(this.canvasEl);
      this.animationEngine.updateSettings(this.settings);

      this.stateMachine = new window.VirtualFriendStateMachine(
        this.animationEngine,
        this.speechBubbleEl,
        this.settings
      );

      // Start animation loop
      this.animationEngine.start();

      // Initialize Video / Site Detector
      this.siteDetector = new window.VirtualFriendSiteDetector((isPlaying, videoEl) => {
        if (this.settings.videoAwarenessEnabled && this.settings.enabled && !this.settings.privacyMode) {
          this.stateMachine.triggerVideoState(isPlaying);
        }
      });
    }

    bindListeners() {
      // Character click & hover interactions
      const charContainer = this.shadowRoot.querySelector('#vf-character-container');
      
      charContainer.addEventListener('click', () => {
        if (this.settings.interactionEnabled && !this.settings.privacyMode) {
          this.stateMachine.triggerInteraction('click');
        }
      });

      charContainer.addEventListener('mouseenter', () => {
        if (this.settings.interactionEnabled && !this.settings.privacyMode) {
          this.stateMachine.triggerInteraction('hover');
        }
      });

      // Storage changes sync
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          for (const [key, { newValue }] of Object.entries(changes)) {
            this.settings[key] = newValue;
          }
          this.applySettings();
        }
      });

      // Runtime messages (e.g. keyboard command for Privacy Mode)
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'privacyModeToggled') {
          this.settings.privacyMode = message.privacyMode;
          this.applySettings();
        }
      });
    }

    applySettings() {
      if (!this.wrapperEl) return;

      const isVisible = this.settings.enabled && !this.settings.privacyMode;

      // Reset positioning & size classes
      const classList = [];
      classList.push(`pos-${this.settings.position || 'bottom-right'}`);
      classList.push(`size-${this.settings.size || 'medium'}`);

      if (!isVisible) {
        if (this.settings.privacyMode) {
          classList.push('privacy-active');
        } else {
          classList.push('is-hidden');
        }
        if (this.animationEngine) this.animationEngine.stop();
      } else {
        if (this.animationEngine) this.animationEngine.start();
      }

      this.wrapperEl.className = classList.join(' ');

      // Opacity setting
      this.wrapperEl.style.opacity = isVisible ? (this.settings.opacity ?? 1.0) : '0';

      // Update Animation Engine settings (character avatar & custom image)
      if (this.animationEngine) {
        this.animationEngine.updateSettings(this.settings);
        setTimeout(() => this.animationEngine.resizeCanvas(), 50);
      }

      // Animation Frequency & Frame Interval update
      if (this.stateMachine) {
        this.stateMachine.setFrequency(this.settings.animationFrequency);
        if (this.settings.frameInterval) {
          this.stateMachine.setIntervalOption(this.settings.frameInterval);
        }
      }
    }
  }

  // Initialize on document ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new VirtualFriendOverlay());
  } else {
    new VirtualFriendOverlay();
  }
})();
