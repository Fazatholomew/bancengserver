const express = require('express');
const { generateToken } = require('../utils/auth');
const print = require('../utils/logging');
const User = require('../models/User');

const authRouter = express.Router();

const createUser = async (req, res) => {
  // Create user based on given userId
  // return signed token so user is logged in automatically
  const { userId, password } = req.body;
  try {
    const user = await User.findOne({ userId: userId.toLowerCase() });
    if (user) {
      res.sendStatus(406);
    } else {
      const newUser = new User({
        userId,
        password,
        generalScore: 0
      });
      newUser.save();
      const { token, error } = generateToken({ userId });
      if (error) {
        print('error', error);
        res.sendStatus(500);
      } else {
        print('access', `Created a new user: ${userId}`);
        res.status(200).json({ token });
      }
    }
  } catch (err) {
    print('error', `Error when getting User from Database with id:${userId}\n${err}`);
    res.sendStatus(500);
  }
  print('access', `IP: ${req.ip} tried to create a new user: ${userId}`);
};

const logInUser = async (req, res) => {
  // User login with userId and password
  // Return token
  const { userId, password } = req.body;
  try {
    const user = await User.findOne({ userId: userId.toLowerCase() });
    if (user) {
      if (!user.currentRoom) {
        user.comparePassword(password, (err, isMatch) => {
          if (err) {
            print('error', err);
            res.sendStatus(500);
          } else {
            if (isMatch) { // eslint-disable-line
              const { token, error } = generateToken({ userId });
              if (error) {
                print('error', err);
                res.sendStatus(500);
              } else {
                print('access', `User ${userId} logged In.`);
                res.status(200).json({ token });
              }
            } else {
              res.sendStatus(403);
            }
          }
        });
      } else {
        res.sendStatus(409);
      }
    } else {
      res.sendStatus(403);
    }
  } catch (err) {
    print('error', `Error when getting User from Database with id:${userId}\n${err}`);
    res.sendStatus(500);
  }
  print('access', `IP: ${req.ip} tried to login to ${userId}.`);
};

authRouter.post('/signup', createUser);
authRouter.post('/login', logInUser);

module.exports = { authRouter };
