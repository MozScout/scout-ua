require('dotenv').config();
const express = require('express');
const app = express();
const dynamoose = require('dynamoose');
const logger = require('./logger');

// DynamoDB init
if (
  process.env.DYNAMODB_USE_LOCAL &&
  (process.env.DYNAMODB_USE_LOCAL === 'true' ||
    process.env.DYNAMODB_USE_LOCAL === '1')
) {
  logger.info(`Using local DynamoDB...`);
  dynamoose.local();
}

// app.js
const UserController = require('./user/UserController');
app.use('/api/users', UserController);

const MobileController = require('./auth/MobileController');
app.use('/api/auth/mobile', MobileController);

const CommandController = require('./command/CommandController');
app.use('/command', CommandController);

const StatusController = require('./articlestatus/ArticleStatusController');
app.use('/article-status', StatusController);

module.exports = app;
