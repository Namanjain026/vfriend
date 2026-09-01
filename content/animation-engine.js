/**
 * Virtual Friend — Animation Engine
 * High-performance 2D Canvas Renderer supporting Image Sprites (Custom & Default Anime Girl)
 * and Procedural Canvas drawing with dynamic particle FX.
 */

class AnimationEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.currentState = 'IDLE';
    this.stateMeta = {};
    this.animTime = 0;
    this.isRunning = false;
    this.rafId = null;
    
    // Character Asset Mode ('anime_image', 'procedural', 'custom_image')
    this.characterType = 'anime_image';
    this.customCharacterDataUrl = null;
    this.characterImg = null;
    this.imgLoaded = false;

    // Mouse tracking for LOOKING / WATCHING states
    this.mouseX = 0;
    this.mouseY = 0;
    
    // Particle systems (Zzz for sleeping, steam/bubbles for shower, hearts for reaction)
    this.particles = [];

    // State Image Assets mapping
    this.stateImagesConfig = {
      DREAMING: 'characters/default/dreaming/dreaming.png',
      SHOWERING: 'characters/default/showering/shower.png',
      SHOWER: 'characters/default/showering/shower.png',
      CHILLING: 'characters/default/chilling/chilling.png',
      ADMIRING: 'characters/default/admiring/admiring.png',
      SLAYING: 'characters/default/slaying/slaying.png',
      WORKING: 'characters/default/working/working.png',
      WATCHING: 'characters/default/watching/watching.png',
      SCROLLING: 'characters/default/scrolling/scrolling.png'
    };
    this.stateImages = {};
    this.preloadStateImages();

    // Frame Sequence Animation Configs (sleep1.png ... sleep8.png loop)
    this.sequenceConfigs = {
      SLEEPING: {
        folder: 'characters/default/sleeping',
        prefix: 'sleep',
        ext: 'png',
        count: 8,
        fps: 6 // keyframe speed (sleep1 -> sleep2 -> ... -> sleep8 -> sleep1)
      }
    };
    this.sequenceFrames = {};
    this.preloadSequenceFrames();
    
    this.bindEvents();
    this.resizeCanvas();
  }

  preloadStateImages() {
    for (const [stateName, path] of Object.entries(this.stateImagesConfig)) {
      const img = new Image();
      img.onload = () => { img._isReady = true; };
      img.src = chrome.runtime.getURL(path);
      this.stateImages[stateName] = img;
    }
  }

  drawStateImage(ctx, stateName, options = {}) {
    const frameImg = this.stateImages[stateName];
    if (!frameImg || (!frameImg.complete && !frameImg._isReady)) return false;

    const {
      bounceY = 0,
      scaleX = 1,
      rotation = 0
    } = options;

    ctx.save();
    ctx.translate(50, 52 + bounceY);
    ctx.scale(scaleX, 1);
    if (rotation) ctx.rotate(rotation);

    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 38 - bounceY * 0.5, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Image
    const imgW = frameImg.naturalWidth || 100;
    const imgH = frameImg.naturalHeight || 100;
    const maxDim = 72;
    let renderW = maxDim;
    let renderH = maxDim;

    if (imgW > imgH) {
      renderH = (imgH / imgW) * maxDim;
    } else {
      renderW = (imgW / imgH) * maxDim;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frameImg, -renderW / 2, -renderH / 2, renderW, renderH);

    ctx.restore();
    return true;
  }

  preloadSequenceFrames() {
    for (const [stateName, config] of Object.entries(this.sequenceConfigs)) {
      this.sequenceFrames[stateName] = [];
      for (let i = 1; i <= config.count; i++) {
        const img = new Image();
        img.onload = () => { img._isReady = true; };
        const path = `${config.folder}/${config.prefix}${i}.${config.ext}`;
        img.src = chrome.runtime.getURL(path);
        this.sequenceFrames[stateName].push(img);
      }
    }
  }

  drawSequenceFrame(ctx, stateName, options = {}) {
    const config = this.sequenceConfigs[stateName];
    const frames = this.sequenceFrames[stateName];

    if (!config || !frames || frames.length === 0) return false;

    // Keyframe animation loop: sleep1 -> sleep2 -> ... -> sleep8 -> sleep1...
    const frameIndex = Math.floor(this.animTime * config.fps) % config.count;
    let frameImg = frames[frameIndex];

    // If target frame is still loading, fallback to any ready frame so round-face never shows
    if (!frameImg || (!frameImg.complete && !frameImg._isReady)) {
      frameImg = frames.find(f => f.complete || f._isReady);
    }

    if (!frameImg || (!frameImg.complete && !frameImg._isReady)) return false;

    const {
      bounceY = 0,
      scaleX = 1,
      rotation = 0
    } = options;

    ctx.save();
    ctx.translate(50, 52 + bounceY);
    ctx.scale(scaleX, 1);
    if (rotation) ctx.rotate(rotation);

    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 38 - bounceY * 0.5, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Keyframe Image
    const imgW = frameImg.naturalWidth || 100;
    const imgH = frameImg.naturalHeight || 100;
    const maxDim = 72;
    let renderW = maxDim;
    let renderH = maxDim;

    if (imgW > imgH) {
      renderH = (imgH / imgW) * maxDim;
    } else {
      renderW = (imgW / imgH) * maxDim;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(frameImg, -renderW / 2, -renderH / 2, renderW, renderH);

    ctx.restore();
    return true;
  }

  updateSettings(settings = {}) {
    const newType = settings.characterType || 'anime_image';
    const newDataUrl = settings.customCharacterDataUrl || null;

    if (this.characterType !== newType || this.customCharacterDataUrl !== newDataUrl || !this.characterImg) {
      this.characterType = newType;
      this.customCharacterDataUrl = newDataUrl;

      if (this.characterType === 'anime_image') {
        const img = new Image();
        img.onload = () => { this.imgLoaded = true; };
        img.onerror = () => { this.imgLoaded = false; };
        img.src = chrome.runtime.getURL('characters/anime_girl.png');
        this.characterImg = img;
      } else if (this.characterType === 'custom_image' && this.customCharacterDataUrl) {
        const img = new Image();
        img.onload = () => { this.imgLoaded = true; };
        img.onerror = () => { this.imgLoaded = false; };
        img.src = this.customCharacterDataUrl;
        this.characterImg = img;
      } else {
        this.characterImg = null;
        this.imgLoaded = false;
      }
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width || 130;
    const h = rect.height || 130;

    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  setState(stateName, meta = {}) {
    if (this.currentState !== stateName) {
      this.currentState = stateName;
      this.stateMeta = meta;
      this.animTime = 0;
      this.particles = [];
      console.log(`[AnimationEngine] Switched to state: ${stateName}`);
    }
  }

  loop() {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.animTime += dt;

    this.render(dt);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  render(dt) {
    this.resizeCanvas();
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);
    ctx.save();

    // Scale to high DPI normalized 100x100 space
    ctx.scale(w / 100, h / 100);

    // Render active state picture/sequence if not custom image
    let drewState = false;
    if (this.characterType !== 'custom_image') {
      const breath = Math.sin(this.animTime * 1.5) * 1.5;
      if (this.currentState === 'SLEEPING') {
        drewState = this.drawSequenceFrame(ctx, 'SLEEPING', { bounceY: breath });
      } else {
        drewState = this.drawStateImage(ctx, this.currentState, { bounceY: breath });
      }
    }

    if (!drewState) {
      // Draw appropriate character state fallback
      switch (this.currentState) {
        case 'SHOWER':
        case 'SHOWERING':
          this.renderShowerState(ctx, dt);
          break;
        case 'SLEEPING':
          this.renderSleepingState(ctx, dt);
          break;
        case 'EATING':
          this.renderEatingState(ctx, dt);
          break;
        case 'WATCHING':
          this.renderWatchingState(ctx, dt);
          break;
        case 'SITTING':
          this.renderSittingState(ctx, dt);
          break;
        case 'LOOKING':
          this.renderLookingState(ctx, dt);
          break;
        case 'REACTION':
          this.renderReactionState(ctx, dt);
          break;
        case 'IDLE':
        default:
          this.renderIdleState(ctx, dt);
          break;
      }
    }

    ctx.restore();
  }

  /* --- Image Character Renderer --- */
  drawImageCharacter(ctx, options = {}) {
    const {
      bounceY = 0,
      scaleX = 1,
      rotation = 0,
      accessory = null
    } = options;

    if (!this.characterImg || !this.imgLoaded) {
      // Fallback to procedural base character if image not ready
      this.drawBaseCharacter(ctx, options);
      return;
    }

    ctx.save();
    ctx.translate(50, 52 + bounceY);
    ctx.scale(scaleX, 1);
    if (rotation) ctx.rotate(rotation);

    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 38 - bounceY * 0.5, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Image Asset
    const imgW = this.characterImg.naturalWidth || 100;
    const imgH = this.characterImg.naturalHeight || 100;
    const maxDim = 72;
    let renderW = maxDim;
    let renderH = maxDim;

    if (imgW > imgH) {
      renderH = (imgH / imgW) * maxDim;
    } else {
      renderW = (imgW / imgH) * maxDim;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.characterImg, -renderW / 2, -renderH / 2, renderW, renderH);

    // 3. Handheld Accessories
    if (accessory === 'sandwich') {
      // Strawberry Crepe
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(8, 6);
      ctx.lineTo(20, 6);
      ctx.lineTo(14, 20);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(14, 4, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (accessory === 'popcorn') {
      // Boba Milk Tea Cup
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(8, 6, 12, 14);

      ctx.fillStyle = '#b45309';
      ctx.fillRect(9, 10, 10, 9);

      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(11, 17, 1.2, 0, Math.PI * 2);
      ctx.arc(14, 16, 1.2, 0, Math.PI * 2);
      ctx.arc(17, 17, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(14, 6);
      ctx.lineTo(17, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* --- Chibi Anime Girl Procedural Vector Renderer --- */
  drawBaseCharacter(ctx, options = {}) {
    const {
      bounceY = 0,
      scaleX = 1,
      eyeState = 'open', // 'open', 'closed', 'wink'
      blush = true,
      hairColor = '#f43f5e', // Vibrant Coral Magenta Hair
      hairHighlight = '#fecdd3', // Soft Pink Glossy Highlight
      eyeColor = '#8b5cf6', // Sapphire / Violet Anime Eyes
      accessory = null
    } = options;

    ctx.save();
    ctx.translate(50, 62 + bounceY);
    ctx.scale(scaleX, 1);

    // 1. Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 32 - bounceY * 0.5, 24, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Back Hair & Swaying Twin Tails
    const sway = Math.sin(this.animTime * 2.5) * 2.5;
    ctx.fillStyle = hairColor;
    
    // Left Twin Tail
    ctx.beginPath();
    ctx.moveTo(-16, -10);
    ctx.bezierCurveTo(-38 + sway, -5, -34 + sway, 25, -20 + sway, 28);
    ctx.bezierCurveTo(-26, 15, -24, 0, -14, -6);
    ctx.fill();

    // Right Twin Tail
    ctx.beginPath();
    ctx.moveTo(16, -10);
    ctx.bezierCurveTo(38 - sway, -5, 34 - sway, 25, 20 - sway, 28);
    ctx.bezierCurveTo(26, 15, 24, 0, 14, -6);
    ctx.fill();

    // Twin Tail Hair Ribbons (Cute Red Bows)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.ellipse(-18, -10, 4, 3, -0.4, 0, Math.PI * 2);
    ctx.ellipse(-14, -12, 3, 4, 0.4, 0, Math.PI * 2);
    ctx.ellipse(18, -10, 4, 3, 0.4, 0, Math.PI * 2);
    ctx.ellipse(14, -12, 3, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Sailor Uniform Body
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.lineTo(16, 10);
    ctx.lineTo(18, 30);
    ctx.lineTo(-18, 30);
    ctx.closePath();
    ctx.fill();

    // Navy Blue Sailor Collar
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(-16, 10);
    ctx.lineTo(16, 10);
    ctx.lineTo(8, 22);
    ctx.lineTo(0, 14);
    ctx.lineTo(-8, 22);
    ctx.closePath();
    ctx.fill();

    // Red Ribbon Bow tie
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.ellipse(-4, 18, 4, 2.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(4, 18, 4, 2.5, 0.3, 0, Math.PI * 2);
    ctx.arc(0, 18, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cute Arms / Sleeves
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-16, 18, 4, 8, 0.2, 0, Math.PI * 2);
    ctx.ellipse(16, 18, 4, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 4. Head & Face
    ctx.fillStyle = '#fff1f2';
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.bezierCurveTo(-22, 12, -22, -18, 0, -18);
    ctx.bezierCurveTo(22, -18, 22, 12, 0, 12);
    ctx.fill();

    // 5. Anime Eyes
    const drawAnimeEye = (centerX, centerY, isRight = false) => {
      ctx.save();
      ctx.translate(centerX, centerY);

      if (eyeState === 'closed') {
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, Math.PI + 0.3, -0.3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(isRight ? 4 : -4, -2);
        ctx.lineTo(isRight ? 6 : -6, -4);
        ctx.stroke();
      } else if (eyeState === 'wink' && isRight) {
        ctx.strokeStyle = '#1e1b4b';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, Math.PI + 0.3, -0.3);
        ctx.stroke();
      } else {
        const irisGrad = ctx.createLinearGradient(0, -6, 0, 6);
        irisGrad.addColorStop(0, '#4c1d95');
        irisGrad.addColorStop(0.5, eyeColor);
        irisGrad.addColorStop(1, '#c084fc');

        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.ellipse(0, -1, 5, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(0, -7.5, 6, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(isRight ? 4 : -4, -8);
        ctx.lineTo(isRight ? 7.5 : -7.5, -10);
        ctx.lineTo(isRight ? 5 : -5, -6);
        ctx.fill();

        ctx.fillStyle = '#1e1035';
        ctx.beginPath();
        ctx.ellipse(0, -1, 2.2, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1.8, -4, 2, 0, Math.PI * 2);
        ctx.arc(1.5, 2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    drawAnimeEye(-9, -2, false);
    drawAnimeEye(9, -2, true);

    // 6. Blush Lines
    if (blush) {
      ctx.fillStyle = 'rgba(244, 114, 182, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-11, 4, 4.5, 2.5, -0.1, 0, Math.PI * 2);
      ctx.ellipse(11, 4, 4.5, 2.5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(225, 29, 72, 0.6)';
      ctx.lineWidth = 1;
      for (let i = -13; i <= -9; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i, 3);
        ctx.lineTo(i + 1, 5);
        ctx.stroke();
      }
      for (let i = 9; i <= 13; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i, 3);
        ctx.lineTo(i + 1, 5);
        ctx.stroke();
      }
    }

    // 7. Mouth (:3 Smile)
    ctx.strokeStyle = '#9f1239';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (accessory === 'sandwich') {
      ctx.fillStyle = '#f43f5e';
      ctx.arc(0, 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.arc(-1.5, 4, 1.8, 0.1, Math.PI - 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(1.5, 4, 1.8, 0.1, Math.PI - 0.2);
      ctx.stroke();
    }

    // 8. Hair Bangs & Locks
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(-4, -8, 0, -3);
    ctx.quadraticCurveTo(4, -8, 0, -18);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.quadraticCurveTo(-14, -8, -10, -3);
    ctx.quadraticCurveTo(-4, -12, -8, -18);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(8, -18);
    ctx.quadraticCurveTo(14, -8, 10, -3);
    ctx.quadraticCurveTo(4, -12, 8, -18);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-16, -12);
    ctx.quadraticCurveTo(-20, 2, -15, 12);
    ctx.quadraticCurveTo(-14, 0, -14, -12);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(16, -12);
    ctx.quadraticCurveTo(20, 2, 15, 12);
    ctx.quadraticCurveTo(14, 0, 14, -12);
    ctx.fill();

    ctx.strokeStyle = hairHighlight;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -14, 13, Math.PI + 0.4, -0.4);
    ctx.stroke();

    // 9. Handheld Accessories
    if (accessory === 'sandwich') {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(-6, 8);
      ctx.lineTo(6, 8);
      ctx.lineTo(0, 20);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2, 7, 3, 0, Math.PI * 2);
      ctx.arc(2, 7, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (accessory === 'popcorn') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(-6, 8, 12, 14);

      ctx.fillStyle = '#b45309';
      ctx.fillRect(-5.5, 12, 11, 9.5);

      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(-3, 19, 1.2, 0, Math.PI * 2);
      ctx.arc(0, 18, 1.2, 0, Math.PI * 2);
      ctx.arc(3, 19, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(3, 1);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* --- State Renderers --- */

  renderIdleState(ctx, dt) {
    const breath = Math.sin(this.animTime * 2.5) * 1.5;
    const isBlinking = Math.sin(this.animTime * 0.7) > 0.95;

    if (this.characterType !== 'procedural' && this.characterImg && this.imgLoaded) {
      this.drawImageCharacter(ctx, { bounceY: breath });
    } else {
      this.drawBaseCharacter(ctx, {
        bounceY: breath,
        eyeState: isBlinking ? 'closed' : 'open'
      });
    }
  }

  renderSittingState(ctx, dt) {
    const sway = Math.sin(this.animTime * 1.8) * 0.8;
    if (this.characterType !== 'procedural' && this.characterImg && this.imgLoaded) {
      this.drawImageCharacter(ctx, { bounceY: 4 + sway });
    } else {
      this.drawBaseCharacter(ctx, {
        bounceY: 4 + sway,
        eyeState: 'open'
      });
    }
  }

  renderEatingState(ctx, dt) {
    const munch = Math.abs(Math.sin(this.animTime * 8)) * 2;
    if (this.characterType !== 'procedural' && this.characterImg && this.imgLoaded) {
      this.drawImageCharacter(ctx, { bounceY: munch, accessory: 'sandwich' });
    } else {
      this.drawBaseCharacter(ctx, {
        bounceY: munch,
        accessory: 'sandwich',
        eyeState: 'open'
      });
    }

    // Crumbs / Sparkle particle effect
    if (Math.random() < 0.15) {
      this.particles.push({
        x: 50 + (Math.random() * 10 - 5),
        y: 68,
        vy: 15 + Math.random() * 15,
        vx: (Math.random() - 0.5) * 10,
        size: 1.8,
        life: 0.6
      });
    }

    this.updateAndDrawParticles(ctx, dt, '#f59e0b');
  }

  renderSleepingState(ctx, dt) {
    const breath = Math.sin(this.animTime * 1.2) * 2;

    // Play 8-frame keyframe sequence (sleep1 -> sleep2 -> ... -> sleep8 -> sleep1...) if not custom image
    let drewSequence = false;
    if (this.characterType !== 'custom_image') {
      drewSequence = this.drawSequenceFrame(ctx, 'SLEEPING', { bounceY: breath });
    }

    if (!drewSequence) {
      if (this.characterType !== 'procedural' && this.characterImg && this.imgLoaded) {
        this.drawImageCharacter(ctx, { bounceY: 6 + breath, rotation: 0.12 });
      } else {
        this.drawBaseCharacter(ctx, {
          bounceY: 6 + breath,
          eyeState: 'closed'
        });
      }
    }

    // Spawn Zzz floating text
    if (Math.random() < 0.03) {
      this.particles.push({
        x: 58,
        y: 45,
        vx: 8,
        vy: -15,
        size: 10 + Math.random() * 4,
        alpha: 1,
        life: 2.0
      });
    }

    // Render Zzz particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 0.5;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.fillStyle = `rgba(168, 85, 247, ${p.alpha})`;
      ctx.font = `bold ${p.size}px sans-serif`;
      ctx.fillText('Z', p.x, p.y);
      ctx.restore();
    }
  }

  renderShowerState(ctx, dt) {
    // 1. Character Silhouette behind shower curtain
    ctx.save();
    ctx.fillStyle = 'rgba(88, 28, 135, 0.45)';
    const moveX = Math.sin(this.animTime * 3) * 6;
    
    ctx.beginPath();
    ctx.ellipse(50 + moveX, 60, 20, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Towel turban on head
    ctx.fillStyle = 'rgba(147, 51, 234, 0.55)';
    ctx.beginPath();
    ctx.ellipse(50 + moveX, 36, 12, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Translucent Opaque Shower Curtain
    ctx.fillStyle = 'rgba(224, 231, 255, 0.75)';
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.9)';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.roundRect(15, 20, 70, 75, 8);
    ctx.fill();
    ctx.stroke();

    // Shower rod & rings
    ctx.fillStyle = '#64748b';
    ctx.fillRect(10, 16, 80, 4);
    for (let rx = 22; rx <= 78; rx += 14) {
      ctx.beginPath();
      ctx.arc(rx, 18, 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Steam & Water droplets particle FX
    if (Math.random() < 0.3) {
      this.particles.push({
        x: 20 + Math.random() * 60,
        y: 90,
        vy: -(20 + Math.random() * 20),
        size: 3 + Math.random() * 5,
        alpha: 0.8,
        life: 1.5
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy * dt;
      p.alpha -= dt * 0.6;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderWatchingState(ctx, dt) {
    const breath = Math.sin(this.animTime * 3) * 1;
    if (this.characterType !== 'procedural' && this.characterImg && this.imgLoaded) {
      this.drawImageCharacter(ctx, { bounceY: breath, accessory: 'popcorn' });
    } else {
      this.drawBaseCharacter(ctx, {
        bounceY: breath,
        accessory: 'popcorn',
        eyeState: 'open'
      });
    }
  }

  renderLookingState(ctx, dt) {
    const wink = Math.sin(this.animTime * 4) > 0.8;
    if (this.characterType !== 'procedural' && this.characterImg && this.imgLoaded) {
      this.drawImageCharacter(ctx, { bounceY: 0, scaleX: wink ? -1 : 1 });
    } else {
      this.drawBaseCharacter(ctx, {
        bounceY: 0,
        eyeState: wink ? 'wink' : 'open'
      });
    }
  }

  renderReactionState(ctx, dt) {
    const jump = Math.abs(Math.sin(this.animTime * 6)) * 6;
    if (this.characterType !== 'procedural' && this.characterImg && this.imgLoaded) {
      this.drawImageCharacter(ctx, { bounceY: -jump });
    } else {
      this.drawBaseCharacter(ctx, {
        bounceY: -jump,
        eyeState: 'wink'
      });
    }

    // Floating heart FX
    if (Math.random() < 0.25) {
      this.particles.push({
        x: 50 + (Math.random() * 30 - 15),
        y: 40,
        vy: -25,
        alpha: 1.0,
        life: 1.0
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.vy * dt;
      p.alpha -= dt;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.fillStyle = `rgba(236, 72, 153, ${p.alpha})`;
      ctx.font = '14px sans-serif';
      ctx.fillText('❤️', p.x, p.y);
      ctx.restore();
    }
  }

  updateAndDrawParticles(ctx, dt, color) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Make globally available in content script space
window.VirtualFriendAnimationEngine = AnimationEngine;
