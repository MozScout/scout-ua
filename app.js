require('dotenv').config();
const express = require('express');
const app = express();
const dynamoose = require('dynamoose');

// DynamoDB init
if (
  process.env.DYNAMODB_USE_LOCAL &&
  (process.env.DYNAMODB_USE_LOCAL === 'true' ||
    process.env.DYNAMODB_USE_LOCAL === '1')
) {
  console.log(`Using local DynamoDB...`);
  dynamoose.local();
}

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
app.use('/articles', ArticleController);

module.exports = app;
