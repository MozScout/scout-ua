var AWS = require('aws-sdk');
var fs = require('fs');
var uuidgen = require('node-uuid-generator');

var polly_tts = {
    
  getSpeechSynthUrl: function(str) {
    return new Promise((resolve, reject) => {
      var polly = new AWS.Polly({
        signatureVersion: 'v4',
        region: 'us-east-1'
      });
      
      let params = {
        'Text': str,
        'OutputFormat': 'mp3',
        'SampleRate' : '16000',
        'VoiceId': 'Kimberly'
      };

      polly.synthesizeSpeech(params, (err, data) => {
        console.log('synthesizeSpeech callback');
        if (err) {
          console.log(err.code)
          reject(err);
        } else if (data) {
          if (data.AudioStream instanceof Buffer) {
            let audio_file = uuidgen.generate() + '.mp3';
            fs.writeFile('./' + audio_file, data.AudioStream, function(err) {
              if (err) {
                reject(err);
                return console.log(err)
              }
              var s3 = new AWS.S3({apiVersion: '2006-03-01'});
              var bucketParams = {
                Bucket: 'scout-streaming-2018',
                Key: '',
                Body: ''
              };

              var fileStream = fs.createReadStream('./' + audio_file);
              fileStream.on('error', function(err) {
                console.log('File Error', err);
                reject('File error:' + err);
                return;
              });
              bucketParams.Body = fileStream;
              var path = require('path');
              bucketParams.Key = path.basename('./' + audio_file);

              s3.upload(bucketParams, function(err, data) {
                if (err) {
                  console.log('error uploading');
                  reject('error uploading:' + err);
                } else {
                  console.log('Upload Success', data.Location);
                  // Return the URL of the Mp3 in the S3 bucket.
                  resolve(data.Location); 
                  // Remove the file.
                  fs.unlink('./' + audio_file, function(err) {
                    if (err) {
                      console.log('error deleting');
                    } else {
                      console.log('successfully deleted');
                    }
                  });
                }
              });
            })
          } else {
            reject('Not a proper AudioStream');
          }
        }
      });
    })
  }
}

 module.exports = polly_tts;