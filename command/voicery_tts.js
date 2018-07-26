var AWS = require('aws-sdk');
var fs = require('fs');
var uuidgen = require('node-uuid-generator');
var audioconcat = require('audioconcat');
var glob = require('glob');
const logger = require('../logger');
const request = require('request');

const voiceryOpts = {
  uri: 'https://www.voicery.com/api/generate',
  method: 'POST',
  body: '',
  headers: {
    'Content-Type': 'application/json; version=1',
    Authorization: 'Bearer ' + process.env.VOICERY_KEY
  }
};

var voicery_tts = {
  getVoiceryChunk: function(text, filenameIndex, audio_file) {
    return new Promise(function(resolve, reject) {
      let body = {
        text: text,
        speaker: 'nicole',
        style: 'conversational'
      };
      voiceryOpts.body = JSON.stringify(body);
      let audioFile = './' + audio_file + '-' + filenameIndex + '.mp3';

      request
        .post(voiceryOpts)
        .on('error', function(err) {
          logger.info('Error:' + err);
          reject(err);
        })
        .on('end', function() {
          logger.debug('Done with chunk');
          resolve(audioFile);
        })
        .pipe(fs.createWriteStream(audioFile));
      logger.debug('Wrote chunk: ' + filenameIndex);
    });
  },

  concatAudio: function(parts, audio_file) {
    return new Promise((resolve, reject) => {
      let filename = './' + audio_file + '.mp3';
      audioconcat(parts)
        .concat(filename)
        .on('start', function(command) {
          logger.debug('starting: ' + Date.now());
          logger.debug('ffmpeg process started:' + command);
        })
        .on('error', function(err, stdout, stderr) {
          logger.error('Error:' + err);
          logger.error('ffmpeg stderr:' + stderr);
          reject(err);
        })
        .on('end', function(output) {
          logger.debug('ending: ' + Date.now());
          logger.debug('Audio created in:' + output);
          resolve(filename);
        });
    });
  },

  getSpeechSynthUrl: function(parts, voiceType) {
    return new Promise((resolve, reject) => {
      let audio_file = uuidgen.generate();
      let promArray = [];
      for (var i = 0; i < parts.length; i++) {
        promArray.push(
          this.getVoiceryChunk(parts[i], i, audio_file, voiceType)
        );
      }

      Promise.all(promArray)
        .then(function(values) {
          logger.debug('resolved the big promise array');
          return voicery_tts.concatAudio(values, audio_file);
        })
        .then(function(newAudioFile) {
          logger.debug('NewAudioFil is: ' + newAudioFile);
          var s3 = new AWS.S3({
            apiVersion: '2006-03-01'
          });
          var bucketParams = {
            Bucket: process.env.POLLY_S3_BUCKET,
            Key: '',
            Body: ''
          };

          var fileStream = fs.createReadStream(newAudioFile);
          fileStream.on('error', function(err) {
            logger.error('File Error' + err);
            reject('File error:' + err);
            return;
          });
          bucketParams.Body = fileStream;
          var path = require('path');
          bucketParams.Key = path.basename(newAudioFile);

          logger.debug('startupload: ' + Date.now());
          s3.upload(bucketParams, function(err, data) {
            if (err) {
              logger.error('error uploading');
              reject('error uploading:' + err);
            } else {
              logger.debug('Upload Success' + data.Location);
              logger.debug('Done uploading: ' + Date.now());
              // Return the URL of the Mp3 in the S3 bucket.
              resolve(data.Location);
              // Remove the files locally.
              voicery_tts.deleteLocalFiles(audio_file, function(err) {
                if (err) {
                  logger.error('Error removing files ' + err);
                } else {
                  logger.debug('all files removed');
                }
              });
            }
          });
        });
    });
  },

  deleteLocalFiles: function(rootFile, callback) {
    let files = glob.sync('./' + rootFile + '*.*');
    var i = files.length;
    files.forEach(function(filepath) {
      fs.unlink(filepath, function(err) {
        i--;
        if (err) {
          callback(err);
          return;
        } else if (i <= 0) {
          callback(null);
        }
      });
    });
  }
};

module.exports = voicery_tts;
