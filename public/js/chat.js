const Chat = {
  chatInput: document.getElementById('chatInput'),
  btnSend: document.getElementById('btnSendChat'),
  chatMessages: document.getElementById('chatMessages'),

  init(socket) {
    this.socket = socket;

    this.btnSend?.addEventListener('click', () => this.sendMessage());
    this.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    this.socket.on('chat-message', (data) => {
      this.appendMessage(data);
    });
  },

  sendMessage() {
    const text = this.chatInput.value.trim();
    if (!text) return;

    this.socket.emit('chat-message', { message: text });
    this.chatInput.value = '';
  },

  appendMessage({ senderName, message, time }) {
    const b = document.createElement('div');
    b.className = 'chat-bubble';

    const author = document.createElement('div');
    author.className = 'author';
    author.innerHTML = `<span>${senderName}</span><span>${time}</span>`;

    const content = document.createElement('div');
    content.textContent = message;

    b.appendChild(author);
    b.appendChild(content);

    this.chatMessages.appendChild(b);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel.classList.contains('hidden')) {
      UI.showToast(`Nova mensagem de ${senderName}`, 'info');
    }
  }
};
