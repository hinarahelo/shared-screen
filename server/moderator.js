const roomStore = require('./rooms');

function isModerator(roomId, socketId) {
  const room = roomStore.getRoom(roomId);
  return !!(room && room.hostId === socketId);
}

function transferModerator(roomId, currentHostId, newHostId) {
  const room = roomStore.getRoom(roomId);
  if (!room || room.hostId !== currentHostId) return false;
  if (!room.participants.has(newHostId)) return false;

  room.hostId = newHostId;
  const oldHost = room.participants.get(currentHostId);
  const newHost = room.participants.get(newHostId);
  if (oldHost) oldHost.isHost = false;
  if (newHost) newHost.isHost = true;
  return true;
}

module.exports = { isModerator, transferModerator };
