const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  people: Array,
  gameState: Array,
  currentOrder: Array,
  isPlaying: Boolean,
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
