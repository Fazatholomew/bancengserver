const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.example' });


const secret = process.env.JWT_SECRET;


/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const { userId } = jwt.verify(token, secret);
    req.userId = userId;
    next();
  } catch (err) {
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
  console.log(secret);
  try {
    return { token: jwt.sign(payload, secret, { expiresIn: '7d' }) };
  } catch (err) {
    return { error: err };
  }
};
