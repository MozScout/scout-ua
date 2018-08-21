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
AWS.config.update({ region: process.env.AWS_REGION });

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

const xcodeQueue = {
  add: function(file) {
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
        console.log('Error', err);
      } else {
        console.log('Success', data.MessageId);
      }
    });
  }
};

module.exports = xcodeQueue;
