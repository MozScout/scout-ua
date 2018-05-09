require('dotenv').config();
var mongoose = require('mongoose');
var express = require('express');
var app = express();

const dynamoose = require('dynamoose');
dynamoose.AWS.config.update({
  accessKeyId: process.env.DYNAMO_ACCCESSKEYID,
  secretAccessKey: process.env.DYNAMO_SECRETACCESSKEY,
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMO_ENDPOINT
});
if (
  process.env.DYNAMO_LOCAL &&
  (process.env.DYNAMO_LOCAL === 'true' || process.env.DYNAMO_LOCAL === '1')
) {
  console.log(`Using local DynamoDB...`);
  dynamoose.local();
} else {
  console.log(`Using DynamoDB @ ${process.env.DYNAMO_ENDPOINT}...`);
}

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
