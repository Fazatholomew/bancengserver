/*
 * Module dependencies.
 */
const express = require('express');
const http = require('http').Server;
const socket = require('socket.io');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const cors = require('cors');
const expressStatusMonitor = require('express-status-monitor');

const { isAuthenticated, socketAuthenticated } = require('./utils/auth');
const print = require('./utils/logging');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
print('', process.env.NODE_ENV);
if (!process.env.NODE_ENV) {
  // only use in development
  print('', 'Configure ENV from .env file');
  dotenv.config({ path: '.env.example' });
}
print('', process.env.NODE_ENV);


/**
 * Socket Controllers (socket event handlers).
 */

const { roomSocketEventHandler } = require('./controllers/room');

/**
 * Controllers (route handlers).
 */

const { roomRouter } = require('./controllers/room');
const { authRouter } = require('./controllers/auth');

/**
 * Create Express server.
 */
const app = express();
const server = http(app);
const io = socket(server);

/**
 * Connect to MongoDB.
 */
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
  print('error', err);
  print('error', '%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.use(expressStatusMonitor({ websocket: io, port: app.get('port') }));
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
  store: new MongoStore({
    url: process.env.MONGODB_URI,
    autoReconnect: true,
  })
}));
app.disable('x-powered-by');
const corsOptions = {
  origin: process.env.FRONT_END_URL,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(cors());
} else {
  app.use(cors(corsOptions));
}


/**
 * Primary app routes.
 */

app.use('/room', isAuthenticated, roomRouter);
app.use('/auth', authRouter);

/**
 * Socket.io events.
 */

io.on('connect', (socket) => {
  try {
    let connInfo = {};
    socket.on('room', (data, callback) => {
      const { type, token, payload } = JSON.parse(data);
      const { error } = socketAuthenticated(token);
      if (error) {
        print('error', error);
      } else {
        if (type === 'ENTER ROOM') {
          connInfo = {
            id: socket.id,
            userId: payload.userId,
            roomId: payload.roomId
          };
        }
        roomSocketEventHandler({
          type,
          payload,
          callback,
          socket
        });
      }
    });
    socket.on('disconnect', (_, callback) => {
      if (connInfo.userId) {
        roomSocketEventHandler({
          type: 'EXIT ROOM',
          payload: connInfo,
          callback,
          socket
        });
      }
    });
  } catch (err) {
    print('error', err);
  }
});

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
} else {
  app.use((err, req, res, next) => {
    print('error', err);
    res.status(500);
  });
}

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
  print('', `${chalk.green('✓')} App is running at http://localhost:${app.get('port')} in ${app.get('env')} mode`);
});

module.exports = app;
