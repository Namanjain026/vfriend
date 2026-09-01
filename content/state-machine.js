/**
 * Virtual Friend — Behavior & State Machine
 * Manages autonomous companion state transitions, time-of-day routines, and speech bubbles.
 */

class StateMachine {
  constructor(animationEngine, speechBubbleEl, settings = {}) {
    this.engine = animationEngine;
    this.speechBubble = speechBubbleEl;
    this.frequency = settings.animationFrequency || 'normal';
    
    this.currentState = 'IDLE';
    this.timerId = null;
    this.speechTimerId = null;

    this.speechMap = {
      IDLE: ["Just hanging out! ✨", "Enjoying the web~ 🌐", "Breathe in, breathe out 🌸", "Nice weather online! ☀️"],
      SITTING: ["Taking a little break ☕", "Comfy corner! 🪑", "Thinking about life... 🤔", "Cozy vibes! 🛋️"],
      EATING: ["Nom nom nom! 🥪", "Snack time! 😋", "Munching away 🍪", "Delicious! 🍎"],
      SLEEPING: ["Zzz... sweet dreams 💤", "Power nap time 🌙", "So sleepy... 😴", "Do not disturb... 🌌"],
      SHOWER: ["Shower time! 🧼", "Splish splash 🚿", "Getting squeaky clean! ✨", "Fresh and clean! 🛁"],
      WATCHING: ["Ooh, a video! 🍿", "Watching together! 📺", "Popcorn ready! 🎥", "This looks good! 🎬"],
      LOOKING: ["Hey there! 👀", "I see you! 💖", "Whatcha looking at? 🔍", "Hi friend! 👋"],
      REACTION: ["Yay! 🎉", "You are awesome! ✨", "Sending love! ❤️", "Hooray! 🌟"]
    };

    // Playlist loop of state pictures + exact requested dialogues (3 seconds per item)
    this.playlist = [
      { state: 'DREAMING', dialogue: 'dreaming about bebetime with mahal' },
      { state: 'SHOWERING', dialogue: 'join me' },
      { state: 'CHILLING', dialogue: 'hop on sky utot' },
      { state: 'ADMIRING', dialogue: 'admiring mahal' },
      { state: 'SLAYING', dialogue: "baybeh's da real art" },
      { state: 'WORKING', dialogue: 'that stupid boss' },
      { state: 'WATCHING', dialogue: 'whatchu watching 🤨😏' },
      { state: 'SCROLLING', dialogue: 'scrolling together 💕' }
    ];
    this.playlistIndex = 0;

    this.frameIntervalMs = this.parseIntervalMs(settings.frameInterval);

    this.start();
  }

  parseIntervalMs(val) {
    if (typeof val === 'number') return val * 1000;
    if (!val) return 3000;
    const str = String(val).toLowerCase().trim();
    if (str === '3s' || str === '3') return 3000;
    if (str === '5s' || str === '5') return 5000;
    if (str === '10s' || str === '10') return 10000;
    if (str === '20s' || str === '20') return 20000;
    if (str === '30s' || str === '30') return 30000;
    if (str === '1m' || str === '60') return 60000;
    if (str === '5m' || str === '300') return 300000;
    if (str === '10m' || str === '600') return 600000;
    if (str === '30m' || str === '1800') return 1800000;
    if (str === '1hr' || str === '3600') return 3600000;
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? 3000 : parsed * 1000;
  }

  setIntervalOption(val) {
    const newInterval = this.parseIntervalMs(val);
    if (newInterval !== this.frameIntervalMs) {
      this.frameIntervalMs = newInterval;
      this.scheduleNextTransition();
    }
  }

  start() {
    this.playNextPlaylistItem();
    this.scheduleNextTransition();
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  setFrequency(freq) {
    this.frequency = freq;
  }

  scheduleNextTransition() {
    if (this.timerId) clearTimeout(this.timerId);

    const delay = this.frameIntervalMs || 3000;
    this.timerId = setTimeout(() => {
      this.playNextPlaylistItem();
      this.scheduleNextTransition();
    }, delay);
  }

  playNextPlaylistItem() {
    if (this.isLocked) return;

    const item = this.playlist[this.playlistIndex];
    this.playlistIndex = (this.playlistIndex + 1) % this.playlist.length;

    this.changeState(item.state, { forceSpeech: true, dialogue: item.dialogue });
  }

  changeState(newState, meta = {}) {
    this.currentState = newState;
    this.engine.setState(newState, meta);

    const speechDuration = this.frameIntervalMs <= 5000 
      ? Math.max(2500, this.frameIntervalMs - 500) 
      : 6000;

    if (meta.dialogue) {
      this.showSpeech(meta.dialogue, speechDuration);
    } else if (meta.forceSpeech || Math.random() < 0.35) {
      this.showSpeechBubbleForState(newState, speechDuration);
    }
  }

  showSpeechBubbleForState(stateName, durationMs = 3000) {
    const quotes = this.speechMap[stateName] || this.speechMap['IDLE'];
    const text = quotes[Math.floor(Math.random() * quotes.length)];
    this.showSpeech(text, durationMs);
  }

  showSpeech(text, durationMs = 3000) {
    if (!this.speechBubble) return;

    this.speechBubble.textContent = text;
    this.speechBubble.classList.add('visible');

    if (this.speechTimerId) clearTimeout(this.speechTimerId);
    this.speechTimerId = setTimeout(() => {
      this.speechBubble.classList.remove('visible');
    }, durationMs);
  }

  /* --- External Trigger Triggers --- */

  triggerVideoState(isPlaying) {
    if (isPlaying) {
      this.isLocked = true;
      this.changeState('WATCHING', { forceSpeech: true });
    } else {
      this.isLocked = false;
      this.changeState('IDLE');
    }
  }

  triggerInteraction(type) {
    if (type === 'click') {
      this.changeState('REACTION', { forceSpeech: true });
      setTimeout(() => {
        if (!this.isLocked) this.changeState('IDLE');
      }, 3000);
    } else if (type === 'hover') {
      if (this.currentState === 'IDLE') {
        this.changeState('LOOKING');
      }
    }
  }
}

// Make globally available in content script space
window.VirtualFriendStateMachine = StateMachine;
