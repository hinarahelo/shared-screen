const Moderator = {
  isHost: false,
  participantsContainer: document.getElementById('participantsList'),

  init(socket) {
    this.socket = socket;

    this.socket.on('kicked', () => {
      alert('Você foi removido da reunião pelo moderador.');
      window.location.href = '/';
    });

    this.socket.on('mute-user', () => {
      WebRTCManager.toggleAudio(false);
      UI.showToast('Você foi silenciado pelo moderador.', 'info');
    });

    this.socket.on('transfer-host', ({ newHostId }) => {
      this.isHost = (this.socket.id === newHostId);
      UI.showToast(this.isHost ? 'Você agora é o Moderador da sala.' : 'A moderação foi transferida.', 'info');
    });
  },

  renderParticipants(participants) {
    if (!this.participantsContainer) return;
    this.participantsContainer.innerHTML = '';

    participants.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'participant-item';

      const info = document.createElement('div');
      info.innerHTML = `<strong>${p.name}</strong> ${p.isHost ? '<span style="color:var(--accent); font-size:0.75rem;">(Mod)</span>' : ''}`;

      const actions = document.createElement('div');
      actions.className = 'participant-actions';

      if (this.isHost && p.id !== this.socket.id) {
        const muteBtn = document.createElement('button');
        muteBtn.className = 'btn btn-secondary';
        muteBtn.style.padding = '0.25rem 0.5rem';
        muteBtn.style.fontSize = '0.75rem';
        muteBtn.textContent = 'Mudar';
        muteBtn.onclick = () => this.socket.emit('mute-user', { targetId: p.id });

        const kickBtn = document.createElement('button');
        kickBtn.className = 'btn btn-danger';
        kickBtn.style.padding = '0.25rem 0.5rem';
        kickBtn.style.fontSize = '0.75rem';
        kickBtn.textContent = 'Expulsar';
        kickBtn.onclick = () => this.socket.emit('kick-user', { targetId: p.id });

        actions.appendChild(muteBtn);
        actions.appendChild(kickBtn);
      }

      item.appendChild(info);
      item.appendChild(actions);
      this.participantsContainer.appendChild(item);
    });
  }
};
