var AWS = require('aws-sdk');
var fs = require('fs');
var uuidgen = require('node-uuid-generator');
var audioconcat = require('audioconcat');
var glob = require('glob');
const logger = require('../logger');

var polly_tts = {
  getPollyChunk: function(text, filenameIndex, audio_file) {
    return new Promise(function(resolve, reject) {
      let rate = process.env.PROSODY_RATE || 'medium';
      let vol = process.env.PROSODY_VOLUME || 'medium';
      var ssmlText =
        '<speak><prosody rate="' +
        rate +
        '" volume="' +
        vol +
        '">' +
        text +
        '</prosody></speak>';

      let params = {
        Text: ssmlText,
        OutputFormat: 'mp3',
        SampleRate: '16000',
        VoiceId: process.env.POLLY_VOICE || 'Salli',
        TextType: 'ssml'
      };

      var polly = new AWS.Polly({
        signatureVersion: 'v4'
      });

      polly.synthesizeSpeech(params, (err, data) => {
        logger.debug(params);
        if (err) {
          logger.error(`ERROR: ${err.code}`);
          reject(err);
        } else if (data) {
          if (data.AudioStream instanceof Buffer) {
            let audioFile = './' + audio_file + '-' + filenameIndex + '.mp3';
            fs.writeFile(audioFile, data.AudioStream, function(err) {
              if (err) {
                reject(err);
                return logger.error(err);
              }
            });
            logger.debug('Wrote chunk: ' + filenameIndex);
            resolve(audioFile);
          } else {
            reject('Not a proper AudioStream');
          }
        }
      });
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

  getSpeechSynthUrl: function(parts) {
    return new Promise((resolve, reject) => {
      let audio_file = uuidgen.generate();
      let promArray = [];
      for (var i = 0; i < parts.length; i++) {
        promArray.push(this.getPollyChunk(parts[i], i, audio_file));
      }

      Promise.all(promArray)
        .then(function(values) {
          logger.debug('resolved the big promise array');
          return polly_tts.concatAudio(values, audio_file);
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
              polly_tts.deleteLocalFiles(audio_file, function(err) {
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

module.exports = polly_tts;
