const crypto = require('crypto');
const express = require('express');
const Room = require('../models/Room');
const { turnGenerator } = require('../utils/player');
const print = require('../utils/logging');

const hash = crypto.createHash('md5');
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
  console.log(payload);
  const data = JSON.parse(payload);
  const { roomId } = data;
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
            const { userId } = payload;
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
                    score: 0
                  }
                ],
              };
              newRoom = {
                ...roomObject,
                people: [...people, userId],
                gameState: [newGameState, ...gameState]
                // latest game state has 0 as its index
              };
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
        if (fetchedRoom.gameState[0].round === 0) {
          // get person who has 3 diamond
          const payloadData = data.cards;
          const players = Object.keys(payloadData);
          console.log(payloadData);
          const turnFirst = players.filter((player) => payloadData[player]['3 Diamond'])[0]; // return userId who has 3 diamond
          console.log(payloadData[turnFirst]);
          const currentOrder = turnGenerator(turnFirst, players);
          console.log(players);
          console.log(currentOrder);
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
    fetchedRoom.overwrite(newRoom);
    fetchedRoom.save((err) => {
      if (err) {
        print('error', `Error when updating roomId: ${roomId}\n${err}`);
        callback({ error: err });
      }
      socket.join(roomId);
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
};

const createRoom = async (req, res, next) => {
  // Create a new room based on current date string
  // return { roomId }
  const { userId } = req.body;
  const hash = crypto.createHash('md5');
  hash.update(new Date().toString());
  let wannaBeId = hash.digest('hex').slice(0, 10);
  let fetchedRoom;
  try {
    fetchedRoom = Room.findOne({ roomId: wannaBeId });
  } catch (err) {
    print('error', `Error when getting Room from Database with id:${wannaBeId}\n${err}`);
    next(err);
  }

  if (fetchedRoom) {
    print('warn', 'roomIds start getting full.');
    const secondHash = crypto.createHash('md5');
    secondHash.update(`${wannaBeId} ${Math.random() * 10}`);
    wannaBeId = secondHash.digest('hex').slice(0, 10);
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