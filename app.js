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
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressStatusMonitor = require('express-status-monitor');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env.example' });

/**
 * Socket Controllers (socket event handlers).
 */

const { enterRoom, startGame, lawan } = require('./controllers/room');

/**
 * Controllers (route handlers).
 */


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
app.use(expressStatusMonitor());
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
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  if (req.path === '/api/upload') {
    // Multer multipart/form-data handling needs to occur before the Lusca CSRF check.
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user
    && req.path !== '/login'
    && req.path !== '/signup'
    && !req.path.match(/^\/auth/)
    && !req.path.match(/\./)) {
    req.session.returnTo = req.originalUrl;
  } else if (req.user
    && (req.path === '/account' || req.path.match(/^\/api/))) {
    req.session.returnTo = req.originalUrl;
  }
  next();
});
app.use('/', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */

/**
 * Socket.io events.
 */

io.on('connect', (socket) => {
  console.log('someone connect.');
  socket.on('enterRoom', (payload, callback) => {
    // User wants to enter given roomId
    enterRoom({ payload, callback, socket });
  });

  socket.on('startGame', (payload, callback) => {
    // User wants to start a game in a spesific room
    startGame({ payload, callback, socket });
  });

  socket.on('lawan', (payload, callback) => {
    // User wants to start a game in a spesific room
    lawan({ payload, callback, socket });
  });
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
    res.status(500).send('Server Error');
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