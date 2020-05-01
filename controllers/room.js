const crypto = require('crypto');
const express = require('express');
const Room = require('../models/Room');
const User = require('../models/User');
const { turnGenerator } = require('../utils/player');
const { countScore } = require('../utils/engine');
const print = require('../utils/logging');

const roomRouter = express.Router();

const roomSocketEventHandler = async ({
  payload,
  type,
  callback,
  socket
}) => {
  // Room is where game is held
  // First room is created by user using post http request to get a new roomId
  // Second user will enter using room Id
  // Third game starts after another user join
  // Fourth game updates
  // Fifth when a round finishes, update database
  const { roomId, userId } = payload;
  let fetchedRoom;
  try {
    fetchedRoom = await Room.findOne({ roomId });
  } catch (err) {
    print('error', `Error when getting Room from Database with id:${roomId}\n${err}`);
  }
  let newRoom;
  let error = '';
  let title = '';
  if (fetchedRoom) {
    const roomObject = fetchedRoom.toObject();
    const { gameState } = roomObject;
    const latestGameState = gameState[0];
    switch (type) {
      // Switch of different events
      case 'ENTER ROOM':
        if (!fetchedRoom.isPlaying) {
          // room is not playing
          if (fetchedRoom.people.length === 4) {
            error = 'Room is full';
          } else {
            /* eslint-disable */
            if (fetchedRoom.people.indexOf(userId) === -1) {
              // user is not in the room
              try {
                await User.updateOne({ userId }, { currentRoom: roomId});
              } catch (err) {
                print('error', `Error when getting User from Database with id:${userId}\n${err}`);
              }

              const newGameState = {
                ...latestGameState,
                players: [
                  ...latestGameState.players,
                  {
                    userId,
                    name: '',
                    cards: [],
                    score: 0,
                    isCuss: false
                  }
                ],
              };
              const people = [userId, ...roomObject.people];
              currentOrder = roomObject.currentOrder[0] ? turnGenerator(roomObject.currentOrder[0], people) : [];
              newRoom = {
                ...roomObject,
                people,
                gameState: [newGameState, ...gameState],
                currentOrder
                // latest game state has 0 as its index
              };
              title = newRoom.people.length < 4 ? `Min ${ 4 - newRoom.people.length}` : 'Kocok sok!';
              socket.join(roomId);
            } else {
              error = 'You\'re already in the room';
            }
          }
        } else {
          error = 'Room is on a game';
        }
        break;
        /* eslint-enable */

      case 'START GAME':
        // Start a game
        // Get players' cards from front-end
        // update database
        if (!fetchedRoom.isPlaying) {
          const payloadData = payload.cards;
          const players = Object.keys(payloadData);
          let turnFirst;
          let currentOrder;
          if (latestGameState.game === 0) {
            // get person who has 3 diamond
            [turnFirst] = players.filter((player) => payloadData[player]['3 Diamond']); // return userId who has 3 diamond
            currentOrder = turnGenerator(turnFirst, roomObject.people);
            title = 'Tiga Tempe Yo!';
          } else {
            currentOrder = turnGenerator(latestGameState.winners[0], roomObject.currentOrder);
            [turnFirst] = currentOrder;
            title = `Jalan ${turnFirst} ajig!`;
            // find winner and starts from there;
          }
          const playersWithCards = latestGameState.players.map((player) => {
            const cards = Object.keys(payloadData[player.userId]);
            return {
              ...player,
              cards: [...cards],
            };
          });
          const newGameState = {
            ...latestGameState,
            currentTurn: turnFirst,
            players: playersWithCards
          };
          newRoom = {
            ...roomObject,
            gameState: [newGameState, ...gameState],
            currentOrder,
            isPlaying: true
          };
        }
        break;

      case 'LAWAN':
        // User who has the turn gives their card
        // Change the table cards
        // Reduce user's card
        // Update database
        if (fetchedRoom.gameState[0].currentTurn === userId) {
          const { cards } = payload;
          const playerIndex = roomObject.currentOrder.indexOf(userId);
          let counter = 0;
          counter += playerIndex;
          const isCussPlayers = {};
          latestGameState.players.forEach((player) => {
            isCussPlayers[player.userId] = player.isCuss;
          });
          const _buffer = [];
          while (true) { // eslint-disable-line
            if (!isCussPlayers[roomObject.currentOrder[counter]]
              && roomObject.currentOrder[counter] !== userId) {
              break;
            }
            _buffer.push(roomObject.currentOrder[counter]);
            counter++;
            counter %= roomObject.currentOrder.length;
          }
          const currentTurn = roomObject.currentOrder[counter];
          const user = latestGameState.players.filter((player) => player.userId === userId)[0];
          const others = latestGameState.players.filter((player) => player.userId !== userId);
          const userCards = user.cards.filter((card) => !cards.includes(card));
          user.cards = userCards;
          const newGameState = {
            ...latestGameState,
            players: [...others, user],
            playingCards: cards,
            round: latestGameState.round + 1,
            currentTurn,
            lastLawan: userId
          };
          newRoom = {
            ...roomObject,
            gameState: [newGameState, ...gameState]
            // latest game state has 0 as its index
          };
          title = `Jalan ${currentTurn} ajig!`;
        }
        break;

      case 'CUSS':
        // Player doesn't want to play
        // add cussCounter
        // turn player isCuss to true
        if (userId) {
          const playerIndex = roomObject.currentOrder.indexOf(userId);
          let table = [...latestGameState.playingCards];
          const user = latestGameState.players.filter((player) => player.userId === userId)[0];
          const others = latestGameState.players.filter((player) => player.userId !== userId);
          if (latestGameState.cussCounter === roomObject.people.length - 2) {
            table = [];
            const modifiedOthers = others.map((player) => ({ ...player, isCuss: false }));
            const newGameState = {
              ...latestGameState,
              currentTurn: latestGameState.lastLawan,
              players: [user, ...modifiedOthers],
              playingCards: table,
              cussCounter: 0,
              round: latestGameState.round + 1,
              lastLawan: '',
            };
            newRoom = {
              ...roomObject,
              gameState: [newGameState, ...roomObject.gameState],
            };
            title = `Culun semua, jalan ${latestGameState.lastLawan}!`;
          } else {
            let counter = 0;
            counter += playerIndex;
            const isCussPlayers = {};
            latestGameState.players.forEach((player) => {
              isCussPlayers[player.userId] = player.isCuss;
            });
            const _buffer = [];
            while (true) { // eslint-disable-line
              if (!isCussPlayers[roomObject.currentOrder[counter]]
                && roomObject.currentOrder[counter] !== userId
                && latestGameState.lastLawan !== roomObject.currentOrder[counter]) {
                break;
              }
              _buffer.push(roomObject.currentOrder[counter]);
              counter++;
              counter %= roomObject.currentOrder.length;
            }
            const currentTurn = roomObject.currentOrder[counter];
            user.isCuss = true;
            const newGameState = {
              ...latestGameState,
              currentTurn,
              players: [user, ...others],
              round: latestGameState.round + 1,
              playingCards: table,
              cussCounter: latestGameState.cussCounter + 1,
            };
            newRoom = {
              ...roomObject,
              gameState: [newGameState, ...roomObject.gameState],
            };
            title = `Culun ${userId}, jalan ${currentTurn}!`;
          }
        }
        break;

      case 'NUTUP':
        // Player has won a game
        // Reset table
        // isPlaying is false
        // Update users' score
        // add game
        // round = 0
        if (userId) {
          const scores = countScore(latestGameState.players, userId);
          const players = latestGameState.players.map((player) => ({
            ...player,
            score: player.score + scores[player.userId],
            isCuss: false,
            cards: []
          }));
          const newGameState = {
            ...latestGameState,
            currentTurn: userId,
            players,
            playingCards: [],
            cussCounter: 0,
            round: 0,
            lastLawan: '',
            winners: [userId, ...latestGameState.winners],
            game: latestGameState.game + 1
          };
          newRoom = {
            ...roomObject,
            isPlaying: false,
            gameState: [newGameState, ...roomObject.gameState],
          };
          title = 'NUTUP AJIG!';
        } else {
          error = 'No UserId';
        }
        break;

      case 'EXIT ROOM':
        if (userId) {
          try {
            await User.updateOne({ userId }, { currentRoom: '' });
          } catch (err) {
            print('error', `Error when getting User from Database with id:${userId}\n${err}`);
          }
          const newPlayers = latestGameState.players.filter((player) => player.userId !== userId);
          const players = newPlayers.map((player) => ({
            ...player,
            isCuss: false,
            cards: [],
          }));
          const newGameState = {
            ...latestGameState,
            players,
            game: newPlayers.length === 0 ? 0 : latestGameState.game,
            playingCards: [],
            cussCounter: 0,
            round: 0,
            lastLawan: '',
          };
          const people = roomObject.people.filter((id) => id !== userId);
          const { winners } = latestGameState;
          const currentTurn = winners[0] ? winners[0] !== userId ? winners[0] : people[0] : people[0]; // eslint-disable-line
          newRoom = {
            ...roomObject,
            people,
            isPlaying: false,
            gameState: [newGameState, ...roomObject.gameState],
            currentOrder: turnGenerator(currentTurn, people)
          };
          title = `${userId} cabut, kocul`;
        }
        break;

      default:
        error = 'Type doesn\'t match anything';
        break;
    }
    // Switch ends
  } else {
    error = 'Room doesn\'t exist';
  }
  if (error) {
    // if there is an error pass execute callback with error
    callback({ error });
  } else {
    // save changes
    if (newRoom) {
      try {
        fetchedRoom.overwrite(newRoom);
        await fetchedRoom.save();
      } catch (err) {
        print('error', `Error when updating roomId: ${roomId}\n${err}`);
        callback({ error: err });
      }
      const order = {};
      newRoom.people.forEach((person) => {
        order[person] = turnGenerator(person, newRoom.people).slice(1);
      });
      const payload = JSON.stringify({
        room: {
          title,
          order,
          isPlaying: newRoom.isPlaying,
          gameState: newRoom.gameState[0]
        }
      });
      socket.emit('update', payload);
      socket.broadcast.emit('update', payload);
    } else {
      print('warn', `Program tries to overwrite ${roomId} with empty object`);
      callback({ error: `Error at updating game. ${type} is not success` });
    }
    print('access', `User ${userId} from room ID: ${roomId} ${type}`);
  }
};

const createRoom = async (req, res) => {
  // Create a new room based on current date string
  // return { roomId }
  const { userId } = req;
  const hash = crypto.createHash('md5');
  hash.update(new Date().toString());
  let wannaBeId = hash.digest('hex').slice(0, 10);
  let fetchedRoom;
  try {
    fetchedRoom = await Room.findOne({ roomId: wannaBeId });
  } catch (err) {
    print('error', `Error when getting Room from Database with id:${wannaBeId}\n${err}`);
    res.sendStatus(500);
  }

  if (fetchedRoom) {
    print('warn', 'roomIds start getting full.');
    const secondHash = crypto.createHash('md5');
    secondHash.update(`${wannaBeId} ${Math.random() * 10}`);
    wannaBeId = secondHash.digest('hex').slice(0, 10);
  }

  const newGameState = {
    players: [],
    playingCards: [
    ],
    currentTurn: '',
    round: 0,
    game: 0,
    winners: [],
    cussCounter: 0,
    lastLawan: ''
  };

  const room = new Room({
    roomId: wannaBeId,
    people: [],
    gameState: [newGameState],
    currentOrder: [],
    isPlaying: false,
    creator: userId
  });

  try {
    room.save();
    print('access', `${userId} created a room with ID: ${wannaBeId}`);
    res.status(200).json({ roomId: wannaBeId });
  } catch (err) {
    print('error', `Error when creating Room with id: ${wannaBeId}\n${err}`);
    res.sendStatus(500);
  }
};

const checkRoom = async (req, res) => {
  // Check roomId if it exists and not full
  const { roomId } = req.params;
  let fetchedRoom;
  try {
    fetchedRoom = await Room.findOne({ roomId });
  } catch (err) {
    print('error', `Error when getting Room from Database with id:${roomId}\n${err}`);
    res.sendStatus(500);
  }

  if (fetchedRoom) {
    if (fetchedRoom.people.length < 4) {
      res.sendStatus(200);
    } else {
      res.sendStatus(429);
    }
  } else {
    res.sendStatus(404);
  }
  print('access', `${req.ip} did a check room with ID: ${roomId}`);
};

roomRouter.get('/:roomId', checkRoom);
roomRouter.post('/', createRoom);

module.exports = { roomRouter, roomSocketEventHandler };
