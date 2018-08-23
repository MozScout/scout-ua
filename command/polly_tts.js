var AWS = require('aws-sdk');
var fs = require('fs');
var uuidgen = require('node-uuid-generator');
var audioconcat = require('audioconcat');
var glob = require('glob');
const logger = require('../logger');
const xcodeQueue = require('./xcodeQueue');
const ffmpeg = require('fluent-ffmpeg');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const Utils = require('./utils');
const utils = new Utils();

var polly_tts = {
  /* Sends a chunk of text to be synthesized by Polly.
  * text: Text to be synthesized (with ssml tags)
  * filenameIndex: an index denoting this chunk of 
  * text's array index (for later stitching)
  * audio_file: the name of the root of the file to
  * attach the index to.
  * voiceType: 
  *
  * resolves: The name of the new synthesized local file.
  * reject: error from Polly.
  */
  getPollyChunk: function(text, filenameIndex, audio_file, voiceType) {
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
        VoiceId: voiceType,
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

  /* Stitches together an array of local audio
  * files using ffmpeg.
  *
  * resolves: The name of the new stitches file.
  * reject: error from ffmpeg 
  */
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

  /* This is special handling for the Pocket audio file.
  * Synthesizes a speech file for an array of text 
  * chunks.
  *  
  * resolves: The name of the new local audio file 
  */
  synthesizeSpeechFile(parts, voiceType) {
    return new Promise(resolve => {
      let audio_file = uuidgen.generate();
      let promArray = [];
      for (var i = 0; i < parts.length; i++) {
        promArray.push(this.getPollyChunk(parts[i], i, audio_file, voiceType));
      }

      Promise.all(promArray)
        .then(function(values) {
          logger.debug('resolved the big promise array');
          return polly_tts.concatAudio(values, audio_file);
        })
        .then(function(newAudioFile) {
          resolve(newAudioFile);
        });
    });
  },

  /* This is special handling for the Pocket audio file.
  * It stitches together the intro and outro for the clients.
  *   
  *    concat intro + body
  *    upload stitched file
  *    resolve stitched file
  *    ... then the rest can be done after the promise resolves
  *    fire xcode request to sqs
  *    handle db writes
  *    upload intro & body separately for Alexa.
  */
  processPocketAudio(introFile, articleFile) {
    return new Promise(resolve => {
      polly_tts
        .concatAudio([introFile, articleFile], uuidgen.generate())
        .then(function(audio_file) {
          return polly_tts.uploadFile(audio_file);
        })
        .then(function(audio_url) {
          return polly_tts.getFileMetadata(audio_url);
        })
        .then(function(audio_metadata) {
          resolve(audio_metadata);
          // Delete the local file now that it's uploaded.
          let audio_file = audio_metadata.url.substr(
            audio_metadata.url.lastIndexOf('/') + 1
          );
          polly_tts.deleteLocalFiles(audio_file, function(err) {
            if (err) {
              logger.error('Error removing files ' + err);
            } else {
              logger.debug('all files removed');
            }
          });
          // Send the stitched file off for transcoding.
          xcodeQueue.add(audio_file);
        });
    });
  },

  /* 
  * This uploads a synthesized file to the
  * configured S3 bucket in the environment
  * variable POLLY_S3_BUCKET.  
  * 
  * resolves: URL of the file
  * reject: error
  */
  uploadFile: function(newAudioFile) {
    return new Promise((resolve, reject) => {
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
          // Return the URL of the Mp3 in the S3 bucket.
          resolve(data.Location);
        }
      });
    });
  },

  /* 
  * This synthesizes the chunked up file
  * and returns a URL of the mp3.  Clients
  * of this function are the Scout skill, 
  * mobile app.  Not used by the pocket app.
  *
  * It also queues the final product for
  * transcoding to opus format in the S3
  * bucket at a later date.  All temp files
  * used to synthesize the file are deleted
  * 
  * resolves: URL of the file
  * reject: error
  */
  getSpeechSynthUrl: function(parts, voiceType) {
    return new Promise((resolve, reject) => {
      let audio_file = uuidgen.generate();
      let promArray = [];
      for (var i = 0; i < parts.length; i++) {
        promArray.push(this.getPollyChunk(parts[i], i, audio_file, voiceType));
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
              //Put the file in queue for transcoding.
              xcodeQueue.add(audio_file + '.mp3');
            }
          });
        });
    });
  },

  /* 
  * Takes a local audio file and:
  * 1.  Uploads to the S3 bucket
  * 2.  Queues it for transcoding to opus
  * 3.  Deletes the local file.
  * Currently used by the Pocket app as a 
  * special handling for the case of stitching
  * the intro/main article instead of returning
  * separate parts.
  *
  * resolves: URL of the audio file in S3 Bucket.
  * reject: error
  */
  postProcessPart: function(audio_file) {
    return new Promise(resolve => {
      polly_tts.uploadFile(audio_file).then(function(audio_url) {
        //Put the file in queue for transcoding.
        logger.debug('audio_file is: ' + audio_file);
        xcodeQueue.add(audio_file.replace(/^.*[\\/]/, ''));
        resolve(audio_url);
        polly_tts.deleteLocalFiles(audio_file, function(err) {
          if (err) {
            logger.error('Error removing files ' + err);
          } else {
            logger.debug('all files removed');
          }
        });
      });
    });
  },

  /* 
  * Takes a local mp3 file:
  * 1. Changes file.mp3 to file*.*
  * 2. Searches locally for file*.* files
  * 3. Iterates through those files and 
  *    deletes them
  * Should only be called after everything has
  * been uploaded.
  */
  deleteLocalFiles: function(rootFile, callback) {
    logger.debug('Entering deleteLocalFiles: ' + rootFile);
    let files = glob.sync(rootFile.replace('.mp3', '*.*'));
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
  },

  /* 
  * Takes an audio_url in S3:
  * Gets the size, sample rate, duration, format, voice
  * for the given file
  *
  * 1. Convert URL to local filename
  * 2. Get the filesize.
  * 3. Get the audio attributes using ffmpeg
  *
  * resolve: metadata object
  * reject: err
  */
  getFileMetadata: function(audio_url) {
    let audio_file = './' + audio_url.substr(audio_url.lastIndexOf('/') + 1);
    return new Promise((resolve, reject) => {
      // Get the filesize first:
      let stats = fs.statSync(audio_file);
      var fileSizeInBytes = stats['size'];
      // Now get the audio attributes
      try {
        ffmpeg.ffprobe(audio_file, function(err, audioInfo) {
          let metadata = {
            format: 'mp3',
            url: audio_url,
            status: 'available',
            voice: 'Joanna',
            sample_rate: audioInfo.streams.sample_rate,
            duration: Math.floor(audioInfo.format.duration),
            size: fileSizeInBytes
          };
          resolve(metadata);
        });
      } catch (err) {
        reject(err);
      }
    });
  },

  /*
  * Given an audio_url in an S3 bucket, returns the
  * size of the file.
  */
  getFileSizeFromUrl: async function(audio_url) {
    logger.debug('getFileSizeFromUrl');
    let file = utils.urlToFile(audio_url);
    logger.debug('file is: ' + file);
    try {
      return s3
        .headObject({
          Key: file,
          Bucket: process.env.POLLY_S3_BUCKET
        })
        .promise()
        .then(res => res.ContentLength);
    } catch (err) {
      logger.error('error: ' + err);
      return 0;
    }
  }
};

module.exports = polly_tts;
