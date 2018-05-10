var AWS = require('aws-sdk');
var fs = require('fs');
var uuidgen = require('node-uuid-generator');
var audioconcat = require('audioconcat');
var glob = require('glob');

var polly_tts = {
  getPollyChunk: function(text, filenameIndex, audio_file) {
    return new Promise(function(resolve, reject) {
      let params = {
        Text: text,
        OutputFormat: 'mp3',
        SampleRate: '16000',
        VoiceId: process.env.POLLY_VOICE || 'Kimberly'
      };

      console.log('pyak', process.env.POLLY_ACCCESSKEYID);
      console.log('pysk', process.env.POLLY_SECRETACCESSKEY);

      var polly = new AWS.Polly({
        signatureVersion: 'v4',
        region: 'us-east-1',
        accessKeyId: process.env.POLLY_ACCCESSKEYID,
        secretAccessKey: process.env.POLLY_SECRETACCESSKEY
      });

      polly.synthesizeSpeech(params, (err, data) => {
        console.log('FirstSpeech: ' + Date.now());
        console.log(params);
        if (err) {
          console.log(`ERROR: ${err.code}`);
          reject(err);
        } else if (data) {
          if (data.AudioStream instanceof Buffer) {
            let audioFile = './' + audio_file + '-' + filenameIndex + '.mp3';
            fs.writeFile(audioFile, data.AudioStream, function(err) {
              if (err) {
                reject(err);
                return console.log(err);
              }
            });
            console.log('Wrote chunk: ' + filenameIndex);
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
          console.log('starting: ' + Date.now());
          console.log('ffmpeg process started:', command);
        })
        .on('error', function(err, stdout, stderr) {
          console.error('Error:', err);
          console.error('ffmpeg stderr:', stderr);
          reject(err);
        })
        .on('end', function(output) {
          console.log('ending: ' + Date.now());
          console.error('Audio created in:', output);
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
          console.log('resolved the big promise array');
          return polly_tts.concatAudio(values, audio_file);
        })
        .then(function(newAudioFile) {
          console.log('NewAudioFil is: ' + newAudioFile);
          var s3 = new AWS.S3({
            apiVersion: '2006-03-01',
            accessKeyId: process.env.POLLY_ACCCESSKEYID,
            secretAccessKey: process.env.POLLY_SECRETACCESSKEY
          });
          var bucketParams = {
            Bucket: process.env.POLLY_S3_BUCKET,
            Key: '',
            Body: ''
          };

          var fileStream = fs.createReadStream(newAudioFile);
          fileStream.on('error', function(err) {
            console.log('File Error', err);
            reject('File error:' + err);
            return;
          });
          bucketParams.Body = fileStream;
          var path = require('path');
          bucketParams.Key = path.basename(newAudioFile);

          console.log('startupload: ' + Date.now());
          s3.upload(bucketParams, function(err, data) {
            if (err) {
              console.log('error uploading');
              reject('error uploading:' + err);
            } else {
              console.log('Upload Success', data.Location);
              console.log('Done uploading: ' + Date.now());
              // Return the URL of the Mp3 in the S3 bucket.
              resolve(data.Location);
              // Remove the files locally.
              polly_tts.deleteLocalFiles(audio_file, function(err) {
                if (err) {
                  console.log('Error removing files ' + err);
                } else {
                  console.log('all files removed');
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
