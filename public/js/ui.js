const UI = {
  elements: {
    videoGrid: document.getElementById('videoGrid'),
    chatPanel: document.getElementById('chatPanel'),
    participantsPanel: document.getElementById('participantsPanel'),
    settingsModal: document.getElementById('settingsModal'),
    participantCounter: document.getElementById('participantCounter'),
    lblRoomId: document.getElementById('lblRoomId'),
    toastContainer: document.getElementById('toast-container')
  },

  init() {
    const roomId = window.location.pathname.split('/').pop();
    if (this.elements.lblRoomId) {
      this.elements.lblRoomId.textContent = roomId;
    }

    document.getElementById('btnCopyLink')?.addEventListener('click', () => {
      const url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: 'Shared Screen', url }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url).then(() => {
          this.showToast('Link da reunião copiado!', 'success');
        });
      }
    });

    document.getElementById('btnFullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    });

    document.getElementById('btnToggleChat')?.addEventListener('click', () => {
      this.elements.chatPanel.classList.toggle('hidden');
      this.elements.participantsPanel.classList.add('hidden');
    });

    document.getElementById('btnCloseChat')?.addEventListener('click', () => {
      this.elements.chatPanel.classList.add('hidden');
    });

    document.getElementById('btnToggleParticipants')?.addEventListener('click', () => {
      this.elements.participantsPanel.classList.toggle('hidden');
      this.elements.chatPanel.classList.add('hidden');
    });

    document.getElementById('btnCloseParticipants')?.addEventListener('click', () => {
      this.elements.participantsPanel.classList.add('hidden');
    });

    document.getElementById('btnSettings')?.addEventListener('click', () => {
      this.elements.settingsModal.classList.remove('hidden');
    });

    document.getElementById('btnCloseSettings')?.addEventListener('click', () => {
      this.elements.settingsModal.classList.add('hidden');
    });
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  updateParticipantCount(count) {
    if (this.elements.participantCounter) {
      this.elements.participantCounter.textContent = count;
    }
  },

  adjustGridLayout() {
    const cards = this.elements.videoGrid.querySelectorAll('.video-card');
    const screenCards = this.elements.videoGrid.querySelectorAll('.screen-card');

    if (screenCards.length > 0) {
      this.elements.videoGrid.className = 'video-grid multi-screen';
    } else if (cards.length === 1) {
      this.elements.videoGrid.className = 'video-grid single';
    } else {
      this.elements.videoGrid.className = 'video-grid';
    }
  }
};

window.addEventListener('DOMContentLoaded', () => UI.init());
