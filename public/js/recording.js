const Recorder = {
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  btnRecord: document.getElementById('btnRecord'),

  init(socket) {
    this.socket = socket;
    this.btnRecord?.addEventListener('click', () => this.toggleRecording());

    this.socket.on('recording-start', () => {
      UI.showToast('Um participante iniciou a gravação da reunião', 'info');
    });

    this.socket.on('recording-stop', () => {
      UI.showToast('A gravação da reunião foi encerrada', 'info');
    });
  },

  async toggleRecording() {
    if (this.isRecording) {
      this.stop();
    } else {
      await this.start();
    }
  },

  async start() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      });

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.onstop = () => {
        this.download();
        stream.getTracks().forEach(t => t.stop());
        this.btnRecord.classList.remove('active-danger');
        this.isRecording = false;
        this.socket.emit('recording-stop');
        UI.showToast('Gravação salva e exportada!', 'success');
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.btnRecord.classList.add('active-danger');
      this.socket.emit('recording-start');
      UI.showToast('Gravação local iniciada', 'success');
    } catch (err) {
      UI.showToast('Gravação cancelada ou não suportada', 'error');
    }
  },

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  },

  download() {
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `meeting-recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
};
