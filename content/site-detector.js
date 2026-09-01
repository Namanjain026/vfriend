/**
 * Virtual Friend — Site & Video Detector
 * Detects video playback across generic websites and YouTube SPA dynamic navigations.
 */

class SiteDetector {
  constructor(onVideoStateChange) {
    this.onVideoStateChange = onVideoStateChange;
    this.observedVideos = new Set();
    this.activeVideo = null;
    this.mutationObserver = null;
    
    this.init();
  }

  init() {
    this.scanAndObserveVideos();
    this.setupMutationObserver();
    this.setupYouTubeListeners();
  }

  scanAndObserveVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach((video) => this.attachVideoListeners(video));
  }

  attachVideoListeners(video) {
    if (this.observedVideos.has(video)) return;
    this.observedVideos.add(video);

    const handlePlay = () => {
      this.activeVideo = video;
      console.log("[SiteDetector] Video started playing.");
      if (this.onVideoStateChange) {
        this.onVideoStateChange(true, video);
      }
    };

    const handlePauseOrEnd = () => {
      // Check if any other video on the page is playing
      const isAnyPlaying = Array.from(this.observedVideos).some(v => !v.paused && !v.ended && v.readyState > 2);
      if (!isAnyPlaying) {
        this.activeVideo = null;
        console.log("[SiteDetector] All videos paused/ended.");
        if (this.onVideoStateChange) {
          this.onVideoStateChange(false, null);
        }
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlay);
    video.addEventListener('pause', handlePauseOrEnd);
    video.addEventListener('ended', handlePauseOrEnd);

    // Initial state check
    if (!video.paused && !video.ended && video.readyState > 2) {
      handlePlay();
    }
  }

  setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'VIDEO') {
              this.attachVideoListeners(node);
            } else {
              const nestedVideos = node.querySelectorAll?.('video');
              if (nestedVideos && nestedVideos.length > 0) {
                nestedVideos.forEach((v) => this.attachVideoListeners(v));
              }
            }
          }
        }
      }
    });

    this.mutationObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  setupYouTubeListeners() {
    // YouTube SPA navigation detection
    window.addEventListener('yt-navigate-finish', () => {
      console.log("[SiteDetector] YouTube SPA navigation finished.");
      setTimeout(() => this.scanAndObserveVideos(), 800);
    });
  }

  destroy() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }
}

// Make globally available in content script space
window.VirtualFriendSiteDetector = SiteDetector;
