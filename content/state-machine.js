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

    this.start();
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

    // Play each picture for 3 seconds (3000 ms) in a loop
    this.timerId = setTimeout(() => {
      this.playNextPlaylistItem();
      this.scheduleNextTransition();
    }, 3000);
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

    if (meta.dialogue) {
      this.showSpeech(meta.dialogue, 3000);
    } else if (meta.forceSpeech || Math.random() < 0.35) {
      this.showSpeechBubbleForState(newState);
    }
  }

  showSpeechBubbleForState(stateName) {
    const quotes = this.speechMap[stateName] || this.speechMap['IDLE'];
    const text = quotes[Math.floor(Math.random() * quotes.length)];
    this.showSpeech(text);
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
