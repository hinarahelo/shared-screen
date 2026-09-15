const socket = io({ reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000 });

const roomId = window.location.pathname.split('/').pop();
let localUserName = localStorage.getItem('user_name') || `User-${Math.floor(Math.random() * 1000)}`;
const roomPassword = sessionStorage.getItem(`pwd_${roomId}`) || '';

// Inicialização de submódulos
Chat.init(socket);
Recorder.init(socket);
Moderator.init(socket);
Settings.init();

// Conexão do Socket
socket.on('connect', async () => {
  await WebRTCManager.initLocalMedia();

  socket.emit('join-room', { roomId, password: roomPassword, userName: localUserName }, (res) => {
    if (!res.success) {
      alert(res.error || 'Não foi possível entrar na sala.');
      window.location.href = '/';
      return;
    }

    Moderator.isHost = res.isHost;
    Moderator.renderParticipants(res.participants);
    UI.updateParticipantCount(res.participants.length);

    // Inicia oferta WebRTC para participantes existentes (Topologia Mesh)
    res.participants.forEach((p) => {
      if (p.id !== socket.id) {
        WebRTCManager.createPeerConnection(p.id, true, socket);
      }
    });
  });
});

socket.on('user-joined', ({ participant, participants }) => {
  UI.showToast(`${participant.name} entrou na sala`, 'info');
  UI.updateParticipantCount(participants.length);
  Moderator.renderParticipants(participants);
});

socket.on('user-left', ({ socketId, participant, participants }) => {
  UI.showToast(`${participant ? participant.name : 'Um participante'} saiu da sala`, 'info');
  WebRTCManager.removeRemoteVideo(socketId);
  if (WebRTCManager.peers[socketId]) {
    WebRTCManager.peers[socketId].close();
    delete WebRTCManager.peers[socketId];
  }
  UI.updateParticipantCount(participants.length);
  Moderator.renderParticipants(participants);
});

// Sinalização P2P
socket.on('offer', async ({ sdp, sender }) => {
  const pc = await WebRTCManager.createPeerConnection(sender, false, socket);
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('answer', { target: sender, sdp: answer });
});

socket.on('answer', async ({ sdp, sender }) => {
  const pc = WebRTCManager.peers[sender];
  if (pc) {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }
});

socket.on('ice-candidate', async ({ candidate, sender }) => {
  const pc = WebRTCManager.peers[sender];
  if (pc && candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('Erro adicionando ICE Candidate recebido', e);
    }
  }
});

// Controles da Barra Inferior
const btnMic = document.getElementById('btnToggleMic');
const btnCam = document.getElementById('btnToggleCam');
const btnScreen = document.getElementById('btnScreenShare');
const btnLeave = document.getElementById('btnLeaveRoom');

btnMic?.addEventListener('click', () => {
  const active = WebRTCManager.toggleAudio();
  btnMic.classList.toggle('active-danger', !active);
  socket.emit('toggle-mic', { muted: !active });
});

btnCam?.addEventListener('click', () => {
  const active = WebRTCManager.toggleVideo();
  btnCam.classList.toggle('active-danger', !active);
  socket.emit('toggle-camera', { muted: !active });
});

let sharing = false;
btnScreen?.addEventListener('click', async () => {
  if (!sharing) {
    sharing = await WebRTCManager.startScreenShare(socket);
    if (sharing) btnScreen.classList.add('active-success');
  } else {
    WebRTCManager.stopScreenShare(socket);
    btnScreen.classList.remove('active-success');
    sharing = false;
  }
});

btnLeave?.addEventListener('click', () => {
  socket.emit('leave-room');
  window.location.href = '/';
});

// Reconexão Inteligente
socket.io.on('reconnect_attempt', () => {
  UI.showToast('Reconectando ao servidor...', 'info');
});

socket.io.on('reconnect', () => {
  UI.showToast('Conexão restabelecida!', 'success');
  socket.emit('join-room', { roomId, password: roomPassword, userName: localUserName }, () => {});
});
