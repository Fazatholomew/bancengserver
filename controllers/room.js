const crypto = require('crypto');

const Room = require('../models/Room');
const { turnGenerator } = require('../utils/player');
const print = require('../utils/logging');

const hash = crypto.createHash('md5');

const enterRoom = ({ payload, callback, socket }) => {
  // Connect user to a room through socket io based on room id
  // payload = { roomId, userId }
  // callback({error})
  console.log('entering room..');
  console.log(payload);
  const { roomId, userId } = payload;
  if (!roomId) {
    // Creating new room
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
        winners: []
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
        const roomObject = room.toObject();
        const payload = JSON.stringify({
          room: {
            ...roomObject,
            gameState: roomObject.gameState[0]
          }
        });
        socket.emit('update', payload);
        socket.broadcast.emit('update', payload);
      });
    });
  } else {
    Room.findOne({ roomId }, (err, confirmRoom) => {
      // Entering room from database
      if (err) {
        print('error', `Error when getting Roomw with roomId: ${roomId} from Database\n${err}`);
        callback({ error: err });
      }
      if (confirmRoom) {
        // roomId exists
        if (!confirmRoom.isPlaying) {
          // room is not playing
          if (confirmRoom.people.length === 4) {
            callback({ error: 'Room is full' });
          } else {
            /* eslint-disable */
            console.log(confirmRoom.people.indexOf(userId));
            if (confirmRoom.people.indexOf(userId) === -1) {
              // user is not in the room
              const roomObject = confirmRoom.toObject();
              const { gameState, people } = roomObject;
              const latestGameState = gameState[0];
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
                ...roomObject,
                people: [...people, userId],
                gameState: [newGameState, ...gameState]
                // latest game state has 0 as its index
              };
              confirmRoom.overwrite(room);
              confirmRoom.save((err) => {
                if (err) {
                  print('error', `Error when adding ${userId} to ${roomId} room\n${err}`);
                  callback({ error: err });
                }
                socket.join(roomId);
                const payload = JSON.stringify({
                  room: {
                    ...room,
                    gameState: room.gameState[0]
                  }
                });
                socket.emit('update', payload);
                socket.broadcast.emit('update', payload);
              });
            } else {
              callback({ error: 'You\'re already in the room' });
            }
          }
        } else {
          callback({ error: 'Room is on a game' });
        }
      } else {
        callback({ error: 'Room doesn\'t exist' });
      }
      /* eslint-enable */
    });
  }
};

const startGame = ({ payload, callback, socket }) => {
  // start a game by getting shuffled from one of user
  // payload = { payload, roomId }
  // callback({error})
  console.log('starting a game..');
  const parse = JSON.parse(payload);
  const { roomId } = parse;
  if (roomId) {
    Room.findOne({ roomId }, (err, confirmRoom) => {
      // get room info from database
      if (err) {
        print('error', `Error when getting Roomw with roomId: ${roomId} from Database\n${err}`);
        callback({ error: err });
      }
      if (confirmRoom) {
        if (confirmRoom.gameState[0].round === 0) {
          // get person who has 3 diamond
          const { payload } = parse;
          const players = Object.keys(payload);
          console.log(payload);
          const turnFirst = players.filter((player) => payload[player]['3 Diamond'])[0]; // return userId who has 3 diamon
          console.log(payload[turnFirst]);
          const currentOrder = turnGenerator(turnFirst, players);
          console.log(players);
          console.log(currentOrder);
          const roomObj = confirmRoom.toObject();
          const gameState = roomObj.gameState[0];
          const playersWithCards = gameState.players.map((player) => {
            const cards = Object.keys(payload[player.userId]);
            return {
              ...player,
              cards: [...cards],
            };
          });
          const newGameState = {
            ...gameState,
            currentTurn: turnFirst,
            players: playersWithCards
          };
          const newRoom = {
            ...roomObj,
            gameState: [newGameState, ...roomObj.gameState],
            currentOrder,
            isPlaying: true
          };
          confirmRoom.overwrite(newRoom);
          confirmRoom.save((err) => {
            if (err) {
              print('error', `Error when saving new state of ${roomId} room\n${err}`);
              callback({ error: err });
            }
            const payload = JSON.stringify({
              room: {
                ...newRoom,
                gameState: newRoom.gameState[0]
              }
            });
            socket.emit('update', payload);
            socket.broadcast.emit('update', payload);
          });
        }
      } else {
        callback({ error: 'Room doesn\'t exist' });
      }
    });
  } else {
    callback('No roomId spesified.');
  }
};

const startGame = ({ payload, callback, socket }) => {
  // start a game by getting shuffled from one of user
  // payload = { payload, roomId }
  // callback({error})
  console.log('starting a game..');
  const parse = JSON.parse(payload);
  const { roomId } = parse;
  if (roomId) {
    Room.findOne({ roomId }, (err, confirmRoom) => {
      // get room info from database
      if (err) {
        print('error', `Error when getting Roomw with roomId: ${roomId} from Database\n${err}`);
        callback({ error: err });
      }
      if (confirmRoom) {
        if (confirmRoom.gameState[0].round === 0) {
          // get person who has 3 diamond
          const { payload } = parse;
          const players = Object.keys(payload);
          console.log(payload);
          const turnFirst = players.filter((player) => payload[player]['3 Diamond'])[0]; // return userId who has 3 diamon
          console.log(payload[turnFirst]);
          const currentOrder = turnGenerator(turnFirst, players);
          console.log(players);
          console.log(currentOrder);
          const roomObj = confirmRoom.toObject();
          const gameState = roomObj.gameState[0];
          const playersWithCards = gameState.players.map((player) => {
            const cards = Object.keys(payload[player.userId]);
            return {
              ...player,
              cards: [...cards],
            };
          });
          const newGameState = {
            ...gameState,
            currentTurn: turnFirst,
            players: playersWithCards
          };
          const newRoom = {
            ...roomObj,
            gameState: [newGameState, ...roomObj.gameState],
            currentOrder,
            isPlaying: true
          };
          confirmRoom.overwrite(newRoom);
          confirmRoom.save((err) => {
            if (err) {
              print('error', `Error when saving new state of ${roomId} room\n${err}`);
              callback({ error: err });
            }
            const payload = JSON.stringify({
              room: {
                ...newRoom,
                gameState: newRoom.gameState[0]
              }
            });
            socket.emit('update', payload);
            socket.broadcast.emit('update', payload);
          });
        }
      } else {
        callback({ error: 'Room doesn\'t exist' });
      }
    });
  } else {
    callback('No roomId spesified.');
  }
};

module.exports = { enterRoom, startGame };
