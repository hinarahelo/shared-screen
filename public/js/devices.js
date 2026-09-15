const DeviceController = {
  audioInputSelect: document.getElementById('selectMic'),
  videoInputSelect: document.getElementById('selectCam'),

  async populateDeviceList() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (this.audioInputSelect) this.audioInputSelect.innerHTML = '';
      if (this.videoInputSelect) this.videoInputSelect.innerHTML = '';

      devices.forEach((device) => {
        const option = document.createElement('option');
        option.value = device.deviceId;

        if (device.kind === 'audioinput') {
          option.text = device.label || `Microfone ${this.audioInputSelect.length + 1}`;
          this.audioInputSelect?.appendChild(option);
        } else if (device.kind === 'videoinput') {
          option.text = device.label || `Câmera ${this.videoInputSelect.length + 1}`;
          this.videoInputSelect?.appendChild(option);
        }
      });
    } catch (err) {
      console.error('Erro ao enumerar periféricos:', err);
    }
  },

  listenDeviceChanges(onChangeCallback) {
    navigator.mediaDevices?.addEventListener('devicechange', async () => {
      await this.populateDeviceList();
      if (onChangeCallback) onChangeCallback();
    });

    this.audioInputSelect?.addEventListener('change', () => {
      if (onChangeCallback) onChangeCallback();
    });

    this.videoInputSelect?.addEventListener('change', () => {
      if (onChangeCallback) onChangeCallback();
    });
  }
};
