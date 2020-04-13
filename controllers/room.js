const crypto = require('crypto');
const express = require('express');
const Room = require('../models/Room');
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
  if (fetchedRoom) {
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
              const roomObject = fetchedRoom.toObject();
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
                    score: 0,
                    isCuss: false
                  }
                ],
              };
              newRoom = {
                ...roomObject,
                people: [...people, userId],
                gameState: [newGameState, ...gameState]
                // latest game state has 0 as its index
              };
              socket.join(roomId);
            } else {
              console.log(userId);
              console.log(fetchedRoom.people)
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
        if (fetchedRoom.gameState[0].round === 0) {
          // get person who has 3 diamond
          const payloadData = payload.cards;
          const players = Object.keys(payloadData);
          const turnFirst = players.filter((player) => payloadData[player]['3 Diamond'])[0]; // return userId who has 3 diamond
          const currentOrder = turnGenerator(turnFirst, players);
          const roomObj = fetchedRoom.toObject();
          const gameState = roomObj.gameState[0];
          const playersWithCards = gameState.players.map((player) => {
            const cards = Object.keys(payloadData[player.userId]);
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
          newRoom = {
            ...roomObj,
            gameState: [newGameState, ...roomObj.gameState],
            currentOrder,
            isPlaying: true
          };
        } else {
          // find winner and starts from there;
        }
        break;

      case 'LAWAN':
        // User who has the turn gives their card
        // Change the table cards
        // Reduce user's card
        // Update database
        if (fetchedRoom.gameState[0].currentTurn === userId) {
          const { cards } = payload;
          const roomObject = fetchedRoom.toObject();
          const { gameState } = roomObject;
          const latestGameState = gameState[0];
          const round = latestGameState.round + 1;
          let counter = 0;
          counter += round % roomObject.currentOrder.length;
          const isCussPlayers = {};
          latestGameState.players.forEach((player) => {
            isCussPlayers[player.userId] = player.isCuss;
          });
          const _buffer = [];
          console.log('CurrentOrder', roomObject.currentOrder);
          while (true) { // eslint-disable-line
            if (!isCussPlayers[roomObject.currentOrder[counter]]
              && roomObject.currentOrder[counter] !== userId) {
              console.log('now', roomObject.currentOrder[counter]);
              break;
            }
            _buffer.push(roomObject.currentOrder[counter]);
            console.log('buffer', _buffer);
            counter++;
            counter %= latestGameState.players.length;
          }
          const currentTurn = roomObject.currentOrder[counter];
          console.log('currentTurn', currentTurn);
          const user = latestGameState.players.filter((player) => player.userId === userId)[0];
          const others = latestGameState.players.filter((player) => player.userId !== userId);
          const userCards = user.cards.filter((card) => !cards.includes(card));
          user.cards = userCards;
          const newGameState = {
            ...latestGameState,
            players: [...others, user],
            playingCards: cards,
            currentTurn,
            round,
            lastLawan: userId
          };
          newRoom = {
            ...roomObject,
            gameState: [newGameState, ...gameState]
            // latest game state has 0 as its index
          };
        }
        break;

      case 'CUSS':
        // Player doesn't want to play
        // add cussCounter
        // turn player isCuss to true
        if (userId) {
          console.log('cuss ing');
          const roomObject = fetchedRoom.toObject();
          const { gameState } = roomObject;
          const latestGameState = gameState[0];
          const round = latestGameState.round + 1;
          let table = [...latestGameState.playingCards];
          const user = latestGameState.players.filter((player) => player.userId === userId)[0];
          const others = latestGameState.players.filter((player) => player.userId !== userId);
          if (latestGameState.cussCounter === roomObject.people.length - 2) {
            console.log('all people cuss');
            table = [];
            const modifiedOthers = others.map((player) => ({ ...player, isCuss: false }));
            const newGameState = {
              ...latestGameState,
              currentTurn: latestGameState.lastLawan,
              players: [user, ...modifiedOthers],
              playingCards: table,
              cussCounter: 0,
              lastLawan: '',
              round
            };
            newRoom = {
              ...roomObject,
              gameState: [newGameState, ...roomObject.gameState],
            };
          } else {
            console.log('not everyone cuss');
            let counter = 0;
            counter += round % roomObject.currentOrder.length;
            const isCussPlayers = {};
            latestGameState.players.forEach((player) => {
              isCussPlayers[player.userId] = player.isCuss;
            });
            const _buffer = [];
            console.log('CurrentOrder', roomObject.currentOrder);
            while (true) { // eslint-disable-line
              if (!isCussPlayers[roomObject.currentOrder[counter]]
                && roomObject.currentOrder[counter] !== userId
                && latestGameState.lastLawan !== roomObject.currentOrder[counter]) {
                console.log('now', roomObject.currentOrder[counter]);
                break;
              }
              _buffer.push(roomObject.currentOrder[counter]);
              console.log('buffer', _buffer);
              counter++;
              counter %= latestGameState.players.length;
            }
            const currentTurn = roomObject.currentOrder[counter];
            console.log('currentTurn', currentTurn);
            user.isCuss = true;
            const newGameState = {
              ...latestGameState,
              currentTurn,
              players: [user, ...others],
              playingCards: table,
              cussCounter: latestGameState.cussCounter + 1,
              round
            };
            newRoom = {
              ...roomObject,
              gameState: [newGameState, ...roomObject.gameState],
            };
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
          const roomObject = fetchedRoom.toObject();
          const { gameState } = roomObject;
          const latestGameState = gameState[0];
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
            game: latestGameState.game + 1
          };
          const currentOrder = turnGenerator(userId, players);
          newRoom = {
            ...roomObject,
            currentOrder,
            isPlaying: false,
            gameState: [newGameState, ...roomObject.gameState],
          };
          console.log(scores);
        } else {
          error = 'No UserId';
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
  console.log('after switch');
  if (error) {
    // if there is an error pass execute callback with error
    callback({ error });
  } else {
    // save changes
    if (newRoom) {
      console.log('omiting new update');
      try {
        fetchedRoom.overwrite(newRoom);
        await fetchedRoom.save();
      } catch (err) {
        print('error', `Error when updating roomId: ${roomId}\n${err}`);
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
    } else {
      print('warn', `Program tries to overwrite ${roomId} with empty object`);
      callback({ error: `Error at updating game. ${type} is not success` });
    }
    print('', `User ${userId} does ${type}`);
  }
};

const createRoom = async (req, res, next) => {
  // Create a new room based on current date string
  // return { roomId }
  console.log('creating new room');
  const hash = crypto.createHash('md5');
  hash.update(new Date().toString());
  let wannaBeId = hash.digest('hex').slice(0, 10);
  let fetchedRoom;
  try {
    fetchedRoom = await Room.findOne({ roomId: wannaBeId });
  } catch (err) {
    print('error', `Error when getting Room from Database with id:${wannaBeId}\n${err}`);
    next(err);
  }

  if (fetchedRoom) {
    print('warn', 'roomIds start getting full.');
    console.log(fetchedRoom, wannaBeId);
    const secondHash = crypto.createHash('md5');
    secondHash.update(`${wannaBeId} ${Math.random() * 10}`);
    wannaBeId = secondHash.digest('hex').slice(0, 10);
  }

  const newGameState = {
    players: [],
    playingCards: [
    ],
    currentTurn: '',
    game: 0,
    round: 0,
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
  });

  try {
    room.save();
  } catch (err) {
    print('error', `Error when creating Room with id: ${wannaBeId}\n${err}`);
    next(err);
  }

  res.json({ roomId: wannaBeId });
};

/* const enterRoom = ({ payload, callback, socket }) => {
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
//             console.log(confirmRoom.people.indexOf(userId));
//             if (confirmRoom.people.indexOf(userId) === -1) {
//               // user is not in the room
//               const roomObject = confirmRoom.toObject();
//               const { gameState, people } = roomObject;
//               const latestGameState = gameState[0];
//               const newGameState = {
//                 ...latestGameState,
//                 players: [
//                   ...latestGameState.players,
//                   {
//                     userId,
//                     name: '',
//                     cards: [],
//                     score: 0
//                   }
//                 ],
//               };
//               const room = {
//                 ...roomObject,
//                 people: [...people, userId],
//                 gameState: [newGameState, ...gameState]
//                 // latest game state has 0 as its index
//               };
//               confirmRoom.overwrite(room);
//               confirmRoom.save((err) => {
//                 if (err) {
//                   print('error', `Error when adding ${userId} to ${roomId} room\n${err}`);
//                   callback({ error: err });
//                 }
//                 socket.join(roomId);
//                 const payload = JSON.stringify({
//                   room: {
//                     ...room,
//                     gameState: room.gameState[0]
//                   }
//                 });
//                 socket.emit('update', payload);
//                 socket.broadcast.emit('update', payload);
//               });
//             } else {
//               callback({ error: 'You\'re already in the room' });
//             }
//           }
//         } else {
//           callback({ error: 'Room is on a game' });
//         }
//       } else {
//         callback({ error: 'Room doesn\'t exist' });
//       }
//       /* eslint-enable */
//     });
//   }
// }; */

/* const startGame = ({ payload, callback, socket }) => {
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
    });
  } else {
    callback('No roomId spesified.');
  }
}; */

roomRouter.post('/', createRoom);

module.exports = { roomRouter, roomSocketEventHandler };

// docker run --name blackhole -v ~/torrent:/utorrent/data -v ~/torrent/setting:/utorrent/settings -p 666:8080 -p 6881:6881 --restart unless-stopped ekho/utorrent:latest
// docker run --name blackhole -v ~/torrent/setting:/datadir -v ~/torrent:/media -p 666:8080 --restart unless-stopped dbarton/utorrent
// docker run -d --name minecraft -v ~/minecraft:/data -e EULA=TRUE -e LEVEL_TYPE=default -e GAMEMODE=survival -e DIFFICULTY=easy -e SERVER_NAME=GO_BIG_OR_GO_HOMR -e ALLOW_CHEATS=true -p 19132:19132/udp itzg/minecraft-bedrock-server
// docker run -d --name minecraft -v ~/minecraft:/data -e EULA=TRUE -e LEVEL_TYPE=default -e GAMEMODE=survival -p 19132:19132/udp itzg/minecraft-bedrock-server
// docker run -d -v ~/mincraft:/data -e TYPE=PAPER -e VERSION=1.9.4 -p 25565:25565 -e EULA=TRUE --name minecraft itzg/minecraft-server --noconsole