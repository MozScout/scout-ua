require('dotenv').config();
var mongoose = require('mongoose');
var express = require('express');
var app = express();

const dynamoose = require('dynamoose');
dynamoose.AWS.config.update({
  accessKeyId: process.env.DYNAMO_ACCCESSKEYID,
  secretAccessKey: process.env.DYNAMO_SECRETACCESSKEY,
  region: 'us-east-1',
  endpoint: 'https://dynamodb.us-east-1.amazonaws.com'
});
// dynamoose.local();

console.log('connecting to mongoose');
mongoose.connect(process.env.MONGO_STRING, {});

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

const ArticleController = require('./article/ArticleStatusController');
app.use('/article', ArticleController);

module.exports = app;
