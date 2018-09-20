/*
 * xcodeQueue.js
 *
 * Logic to ADD messages to the SQS queue for future transcoding 
 * to the requested format.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var uuidgen = require('node-uuid-generator');
var AWS = require('aws-sdk');
const logger = require('../logger');
AWS.config.update({ region: process.env.AWS_REGION });

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

const xcodeQueue = {
  add: function(file) {
    if (process.env.SQS_QUEUE) {
      logger.debug('XCODE: filename: ' + file);
      var jsonBody = {
        filename: file,
        targetCodec: 'opus 24'
      };

      var params = {
        MessageAttributes: {},
        MessageGroupId: 'scout',
        MessageDeduplicationId: uuidgen.generate(),
        MessageBody: JSON.stringify(jsonBody),
        QueueUrl: process.env.SQS_QUEUE
      };

      sqs.sendMessage(params, function(err, data) {
        if (err) {
          logger.error('Error', err);
        } else {
          logger.debug('Success', data.MessageId);
        }
      });
    } else {
      logger.debug('No SQS queue defined, skipping XCode message.');
    }
  }
};

module.exports = xcodeQueue;
