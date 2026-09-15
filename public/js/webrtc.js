const WebRTCManager = {
  localStream: null,
  screenStream: null,
  peers: {}, // remoteSocketId -> RTCPeerConnection
  iceConfiguration: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
      // A estrutura aceita entradas TURN carregadas aqui
    ]
  },

  async initLocalMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      const localVideo = document.getElementById('localVideo');
      if (localVideo) localVideo.srcObject = this.localStream;
      await DeviceController.populateDeviceList();
    } catch (err) {
      console.warn('Não foi possível obter câmera e microfone:', err);
      UI.showToast('Sem acesso à câmera/microfone.', 'error');
    }
  },

  async createPeerConnection(targetId, isInitiator, socket) {
    if (this.peers[targetId]) return this.peers[targetId];

    const pc = new RTCPeerConnection(this.iceConfiguration);
    this.peers[targetId] = pc;

    // Adiciona tracks de vídeo e áudio locais à conexão P2P
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream));
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => pc.addTrack(track, this.screenStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { target: targetId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      this.handleRemoteStream(targetId, event.streams[0], event.track);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      const elState = document.getElementById('webrtcIceState');
      if (elState) elState.textContent = state;
      if (state === 'failed' || state === 'disconnected') {
        this.removeRemoteVideo(targetId);
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { target: targetId, sdp: offer });
      } catch (err) {
        console.error('Erro criando Offer:', err);
      }
    }

    return pc;
  },

  handleRemoteStream(remoteSocketId, stream, track) {
    const isScreen = track.label.toLowerCase().includes('screen') || track.kind === 'video' && stream.getVideoTracks().length > 1;
    const cardId = isScreen ? `card-screen-${remoteSocketId}` : `card-cam-${remoteSocketId}`;

    let card = document.getElementById(cardId);
    if (!card) {
      card = document.createElement('div');
      card.id = cardId;
      card.className = isScreen ? 'video-card screen-card' : 'video-card';

      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;

      const overlay = document.createElement('div');
      overlay.className = 'video-overlay-info';
      overlay.textContent = isScreen ? 'Tela Remota' : `Participante`;

      card.appendChild(video);
      card.appendChild(overlay);
      UI.elements.videoGrid.appendChild(card);
      UI.adjustGridLayout();
    }
  },

  removeRemoteVideo(socketId) {
    document.getElementById(`card-cam-${socketId}`)?.remove();
    document.getElementById(`card-screen-${socketId}`)?.remove();
    UI.adjustGridLayout();
  },

  async startScreenShare(socket) {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: true
      });

      // Adiciona o card da própria tela compartilhada localmente
      const localScreenCard = document.createElement('div');
      localScreenCard.id = 'card-local-screen';
      localScreenCard.className = 'video-card screen-card';
      const localScreenVideo = document.createElement('video');
      localScreenVideo.autoplay = true;
      localScreenVideo.muted = true;
      localScreenVideo.srcObject = this.screenStream;
      localScreenCard.appendChild(localScreenVideo);
      UI.elements.videoGrid.appendChild(localScreenCard);
      UI.adjustGridLayout();

      const screenTrack = this.screenStream.getVideoTracks()[0];

      // Propaga o track aos peers conectados
      for (const targetId in this.peers) {
        const pc = this.peers[targetId];
        pc.addTrack(screenTrack, this.screenStream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { target: targetId, sdp: offer });
      }

      screenTrack.onended = () => this.stopScreenShare(socket);
      socket.emit('start-screen-share');
      UI.showToast('Compartilhamento de tela ativo', 'success');
      return true;
    } catch (e) {
      console.warn('Usuário cancelou compartilhamento de tela:', e);
      return false;
    }
  },

  stopScreenShare(socket) {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    document.getElementById('card-local-screen')?.remove();
    UI.adjustGridLayout();
    socket.emit('stop-screen-share');
    UI.showToast('Compartilhamento de tela encerrado', 'info');
  },

  toggleAudio(enabled) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = (enabled !== undefined) ? enabled : !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  },

  toggleVideo(enabled) {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = (enabled !== undefined) ? enabled : !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }
};
