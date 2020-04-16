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
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const expressStatusMonitor = require('express-status-monitor');

const { isAuthenticated } = require('./utils/auth');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env.example' });

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
 * API keys and Passport configuration.
 */
// const passportConfig = require('./config/passport');

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
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
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
app.use(cors());

/**
 * Primary app routes.
 */

app.use('/room', isAuthenticated, roomRouter);
app.use('/auth', authRouter);

/**
 * Socket.io events.
 */

io.on('connect', (socket) => {
  console.log('someone connect.');
  socket.on('room', (data, callback) => {
    const { type, payload } = JSON.parse(data);
    roomSocketEventHandler({
      type,
      payload,
      callback,
      socket
    });
  });
  socket.on('disconnect', () => console.log('going out'));
});

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
} else {
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500);
  });
}

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});

module.exports = app;

// docker run --name=blackhole -e PUID=6969 -e PGID=666 -e TZ=Europe/London -e USER=admin -e PASS=TannerJones -p 666:9091 -p 51413:51413 -p 51413:51413/udp -v ~/torrent/log:/config -v ~/torrent/downloads:/downloads -v ~/torrent/watch:/watch --restart unless-stopped linuxserver/transmission
// docker run -d -p 6969:80 --name=cloud -v ~/cloud:/var/www/html/data --restart unless-stopped nextcloud