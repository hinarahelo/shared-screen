class RoomStore {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(roomId, { hostId, passwordHash = null, maxParticipants = 20 }) {
    const room = {
      id: roomId,
      hostId,
      passwordHash,
      isLocked: false,
      maxParticipants,
      createdAt: Date.now(),
      participants: new Map() // socketId -> participantData
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  removeRoom(roomId) {
    return this.rooms.delete(roomId);
  }

  addParticipant(roomId, socketId, userProfile) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    room.participants.set(socketId, {
      id: socketId,
      name: userProfile.name || `Usuário-${socketId.substring(0, 4)}`,
      isHost: room.hostId === socketId,
      micMuted: false,
      camMuted: false,
      isSharingScreen: false,
      joinedAt: Date.now()
    });
    return room.participants.get(socketId);
  }

  removeParticipant(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    const removed = room.participants.get(socketId);
    room.participants.delete(socketId);
    return { room, removed };
  }

  getParticipantsArray(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return [];
    return Array.from(room.participants.values());
  }
}

module.exports = new RoomStore();
