const crypto = require('crypto');
const Room = require('../models/Room');

const hash = crypto.createHash('md5');
const print = require('../utils/logging');

const enterRoom = ({ payload, callback, socket }) => {
  // Connect user to a room through socket io based on room id
  // payload = { roomId, userId }
  // callback({error})
  console.log('entering room..');
  console.log(payload);
  const { roomId, userId } = payload;
  if (!roomId) {
    console.log('creating new room;');
    hash.update(new Date().toString());
    let wannaBeId = hash.digest('hex').slice(0, 10);
    Room.findOne({ roomId: wannaBeId }, (err, existingRoom) => {
      if (err) {
        print('error', `Error when getting Room from Database with id:${wannaBeId}\n${err}`);
        callback({ error: err });
      }

      if (existingRoom) {
        print('warn', 'roomIds start getting full.');
        hash.update(`${Math.random()} ${wannaBeId}`);
        wannaBeId = hash.digest('hex').slice(0, 10);
      }
      const newGameState = {
        players: [
          {
            userId,
            name: '',
            cards: [],
            score: 0
          }
        ],
        playingCards: [
        ],
        currentTurn: '',
        game: 0,
        round: 0,
      };
      const room = new Room({
        roomId: wannaBeId,
        people: [userId],
        gameState: [newGameState],
        currentOrder: [],
        isPlaying: false,
      });
      room.save((err) => {
        if (err) {
          print('error', `Error when creating Room with id: ${wannaBeId}\n${err}`);
          callback({ error: err });
        }
        console.log(wannaBeId);
        socket.join(wannaBeId);
        socket.emit('update', JSON.stringify({ ...room, gameState: room.gameState[room.gameState.length - 1] }));
      });
    });
  } else {
    Room.findOne({ roomId }, (err, confirmRoom) => {
      if (err) {
        print('error', `Error when getting Room from Database\n${err}`);
        callback({ error: err });
      }
      if (confirmRoom) {
        if (!confirmRoom.isPlaying) {
          if (confirmRoom.people.length === 4) {
            callback({ error: 'Room is full' });
          } else {
            const { gameState, people } = confirmRoom;
            const latestGameState = gameState[gameState.length - 1];
            const newGameState = {
              ...latestGameState,
              players: [
                ...latestGameState.players,
                {
                  userId,
                  name: '',
                  cards: [],
                  score: 0
                }
              ],
            };
            const room = {
              ...confirmRoom,
              people: [...people, userId],
              gameState: newGameState
            };
            confirmRoom.overwrite(room);
            confirmRoom.save((err) => {
              if (err) {
                print('error', `Error when adding ${userId} to ${roomId} room\n${err}`);
                callback({ error: err });
              }
              socket.join(roomId);
              socket.emit('update', JSON.stringify({
                room: {
                  ...room,
                  gameState: room.gameState[room.gameState.length - 1]
                }
              }));
            });
          }
        } else {
          callback({ error: 'Room is on a game' });
        }
      } else {
        callback({ error: 'Room doesn\'t exist' });
      }
    });
  }
};

module.exports = { enterRoom };
