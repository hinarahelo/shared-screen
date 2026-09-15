const Settings = {
  resolutionSelect: document.getElementById('selectResolution'),

  init() {
    this.resolutionSelect?.addEventListener('change', (e) => {
      this.applyVideoConstraints(e.target.value);
    });
  },

  async applyVideoConstraints(resolution) {
    let constraints = {};
    switch (resolution) {
      case '360p':
        constraints = { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15 } };
        break;
      case '720p':
        constraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };
        break;
      case '1080p':
        constraints = { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
        break;
      default:
        constraints = true;
    }

    if (WebRTCManager.localStream) {
      const videoTrack = WebRTCManager.localStream.getVideoTracks()[0];
      if (videoTrack && typeof constraints === 'object') {
        try {
          await videoTrack.applyConstraints(constraints);
          UI.showToast(`Resolução ajustada para ${resolution}`, 'info');
        } catch (e) {
          console.warn('Falha ao aplicar resolução no dispositivo local:', e);
        }
      }
    }
  }
};
