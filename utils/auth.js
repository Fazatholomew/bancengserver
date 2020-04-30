const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const print = require('./logging');

if (!process.env.NODE_ENV) {
  // only use in development
  dotenv.config({ path: '.env.example' });
}


const secret = process.env.JWT_SECRET;


/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  let userId;
  try {
    const token = req.headers.authorization.split(' ')[1];
    userId = jwt.verify(token, secret).userId;
    req.userId = userId;
    next();
  } catch (err) {
    print('error', `Tries to authenticate ${userId}\n${err}`);
    res.sendStatus(403);
  }
};

/**
 * Token verification for socket connection.
 */

exports.socketAuthenticated = (token) => {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return { error: err };
  }
};

/**
 * Generate token by any given payload
 */

exports.generateToken = (payload) => {
  try {
    return { token: jwt.sign(payload, secret, { expiresIn: '7d' }) };
  } catch (err) {
    return { error: err };
  }
};
