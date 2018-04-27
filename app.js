require('dotenv').config();
var express = require('express');
var app = express();

// app.js

app.get('/hello', function(req, res) {
  res.status(200).send(
    `Hello! pocket=${process.env.POCKET_KEY}, 
      pollybucket=${process.env.POLLY_S3_BUCKET}`
  );
});

var UserController = require('./user/UserController');
app.use('/api/users', UserController);

var AuthController = require('./auth/AuthController');
app.use('/api/auth', AuthController);

var MobileController = require('./auth/MobileController');
app.use('/api/auth/mobile', MobileController);

var CommandController = require('./command/CommandController');
app.use('/command', CommandController);

module.exports = app;
