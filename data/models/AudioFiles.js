/*
 * AudioFiles.js
 *
 * Data model for storing audio files.
 *
 * Author: Tamara Hills
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  item_id: {
    type: String,
    hashKey: true
  },
  uuid: {
    type: String,
    rangeKey: true,
    required: true
  },
  type: String, // Can be intro, outro, article, mobile
  lang: String, // localization identifier for lang (e.g en)
  locale: String, // locale the voice is synthesized for (e.g. US)
  voice: String, // voice the file is synthesized with (e.g. Joanna)
  codec: String, // codec (e.g. opus|mp3)
  bitrate: String, // bit rate of the file (e.g. 24000)
  duration: Number, // length of the file in seconds
  samplerate: Number, // the sample rate of the file
  size: String, // Size of the file in bytes
  url: String, // url of the s3 file
  date: Date // Date the file was uploaded
});

const AudioFiles = dynamoose.model('AudioFiles', schema);

module.exports = AudioFiles;
