const roomStore = require('./rooms');
const { verifyPassword } = require('./auth');
const { isModerator, transferModerator } = require('./moderator');
const { sanitizeText } = require('./utils');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let currentRoomId = null;

    socket.on('create-room', async (data, callback) => {
      const { roomId, passwordHash } = data;
      if (!roomId) {
        return callback({ success: false, error: 'ID da sala inválido.' });
      }
      if (roomStore.hasRoom(roomId)) {
        return callback({ success: false, error: 'Sala já existe.' });
      }

      roomStore.createRoom(roomId, { hostId: socket.id, passwordHash });
      callback({ success: true, roomId });
    });

    socket.on('join-room', async (data, callback) => {
      const { roomId, password, userName } = data;
      const room = roomStore.getRoom(roomId);

      if (!room) {
        return callback({ success: false, error: 'Sala não encontrada.' });
      }
      if (room.isLocked) {
        return callback({ success: false, error: 'Esta sala foi trancada pelo moderador.' });
      }
      if (room.participants.size >= room.maxParticipants) {
        return callback({ success: false, error: 'A sala atingiu o limite de participantes (20).' });
      }
      if (room.passwordHash) {
        const isMatch = await verifyPassword(password, room.passwordHash);
        if (!isMatch) {
          return callback({ success: false, error: 'Senha incorreta.', requirePassword: true });
        }
      }

      currentRoomId = roomId;
      socket.join(roomId);

      const participant = roomStore.addParticipant(roomId, socket.id, {
        name: sanitizeText(userName) || `User-${socket.id.substring(0, 4)}`
      });

      callback({
        success: true,
        participant,
        isHost: participant.isHost,
        participants: roomStore.getParticipantsArray(roomId)
      });

      socket.to(roomId).emit('user-joined', {
        participant,
        participants: roomStore.getParticipantsArray(roomId)
      });
    });

    // WebRTC Signaling
    socket.on('offer', (data) => {
      socket.to(data.target).emit('offer', {
        sdp: data.sdp,
        sender: socket.id,
        streamType: data.streamType // 'cam' ou 'screen'
      });
    });

    socket.on('answer', (data) => {
      socket.to(data.target).emit('answer', {
        sdp: data.sdp,
        sender: socket.id,
        streamType: data.streamType
      });
    });

    socket.on('ice-candidate', (data) => {
      socket.to(data.target).emit('ice-candidate', {
        candidate: data.candidate,
        sender: socket.id,
        streamType: data.streamType
      });
    });

    // Periféricos e Estado
    socket.on('toggle-mic', ({ muted }) => {
      if (!currentRoomId) return;
      const room = roomStore.getRoom(currentRoomId);
      const p = room?.participants.get(socket.id);
      if (p) {
        p.micMuted = muted;
        io.to(currentRoomId).emit('toggle-mic', { socketId: socket.id, muted });
      }
    });

    socket.on('toggle-camera', ({ muted }) => {
      if (!currentRoomId) return;
      const room = roomStore.getRoom(currentRoomId);
      const p = room?.participants.get(socket.id);
      if (p) {
        p.camMuted = muted;
        io.to(currentRoomId).emit('toggle-camera', { socketId: socket.id, muted });
      }
    });

    socket.on('start-screen-share', () => {
      if (!currentRoomId) return;
      const room = roomStore.getRoom(currentRoomId);
      const p = room?.participants.get(socket.id);
      if (p) {
        p.isSharingScreen = true;
        io.to(currentRoomId).emit('start-screen-share', { socketId: socket.id });
      }
    });

    socket.on('stop-screen-share', () => {
      if (!currentRoomId) return;
      const room = roomStore.getRoom(currentRoomId);
      const p = room?.participants.get(socket.id);
      if (p) {
        p.isSharingScreen = false;
        io.to(currentRoomId).emit('stop-screen-share', { socketId: socket.id });
      }
    });

    // Chat
    socket.on('chat-message', (data) => {
      if (!currentRoomId) return;
      const text = sanitizeText(data.message);
      if (!text) return;

      const room = roomStore.getRoom(currentRoomId);
      const sender = room?.participants.get(socket.id);

      io.to(currentRoomId).emit('chat-message', {
        senderId: socket.id,
        senderName: sender ? sender.name : 'Desconhecido',
        message: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });

    // Moderação
    socket.on('room-locked', ({ locked }) => {
      if (!currentRoomId || !isModerator(currentRoomId, socket.id)) return;
      const room = roomStore.getRoom(currentRoomId);
      if (room) {
        room.isLocked = locked;
        io.to(currentRoomId).emit(locked ? 'room-locked' : 'room-unlocked', {
          by: socket.id
        });
      }
    });

    socket.on('kick-user', ({ targetId }) => {
      if (!currentRoomId || !isModerator(currentRoomId, socket.id)) return;
      io.to(targetId).emit('kicked');
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.leave(currentRoomId);
      }
      handleParticipantLeave(currentRoomId, targetId);
    });

    socket.on('mute-user', ({ targetId }) => {
      if (!currentRoomId || !isModerator(currentRoomId, socket.id)) return;
      io.to(targetId).emit('mute-user');
    });

    socket.on('transfer-host', ({ newHostId }) => {
      if (!currentRoomId) return;
      const success = transferModerator(currentRoomId, socket.id, newHostId);
      if (success) {
        io.to(currentRoomId).emit('transfer-host', { newHostId });
      }
    });

    // Gravação
    socket.on('recording-start', () => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('recording-start', { by: socket.id });
    });

    socket.on('recording-stop', () => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('recording-stop', { by: socket.id });
    });

    // Desconexão
    socket.on('leave-room', () => {
      if (currentRoomId) {
        socket.leave(currentRoomId);
        handleParticipantLeave(currentRoomId, socket.id);
        currentRoomId = null;
      }
    });

    socket.on('disconnect', () => {
      if (currentRoomId) {
        handleParticipantLeave(currentRoomId, socket.id);
      }
    });

    function handleParticipantLeave(roomId, socketId) {
      const result = roomStore.removeParticipant(roomId, socketId);
      if (!result || !result.room) return;

      const { room, removed } = result;

      io.to(roomId).emit('user-left', {
        socketId,
        participant: removed,
        participants: roomStore.getParticipantsArray(roomId)
      });

      if (room.participants.size === 0) {
        roomStore.removeRoom(roomId);
      } else if (room.hostId === socketId) {
        const remaining = Array.from(room.participants.keys());
        if (remaining.length > 0) {
          const nextHostId = remaining[0];
          transferModerator(roomId, socketId, nextHostId);
          io.to(roomId).emit('transfer-host', { newHostId: nextHostId });
        }
      }
    }
  });
}

module.exports = { registerSocketHandlers };
