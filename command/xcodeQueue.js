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

var AWS = require('aws-sdk');
const logger = require('../logger');
const constants = require('../constants');
AWS.config.update({ region: process.env.AWS_REGION });

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

const xcodeQueue = {
  useXcode: function() {
    return !!process.env.SQS_QUEUE;
  },

  add: function(file, item_id) {
    if (this.useXcode()) {
      logger.debug('XCODE: filename: ' + file);
      this.addTranscode(
        file,
        item_id,
        constants.strings.CODEC_OPUS_CAF,
        constants.strings.CONTAINER_CAF
      );
      this.addTranscode(
        file,
        item_id,
        constants.strings.CODEC_OPUS_MKV,
        constants.strings.CONTAINER_MKV
      );
    } else {
      logger.debug('No SQS queue defined, skipping XCode message.');
    }
  },

  addTranscode: function(file, item_id, codec, container) {
    var jsonBody = {
      filename: file,
      targetCodec: codec,
      bitrate: '24k',
      container: container,
      item_id: item_id
    };

    var params = {
      MessageAttributes: {},
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
  }
};

module.exports = xcodeQueue;
