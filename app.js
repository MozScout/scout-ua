var express = require('express');
var app = express();

// app.js
app.get('/api', function (req, res) {
  res.status(200).send('API works.');
});

app.get('/hello', function(req, res) {
  res.status(200).send('hello world');
});

var UserController = require('./user/UserController');
app.use('/api/users', UserController);


var AuthController = require('./auth/AuthController');
app.use('/api/auth', AuthController);

var CommandController = require('./command/CommandController');
app.use('/command', CommandController);
 
module.exports = app;