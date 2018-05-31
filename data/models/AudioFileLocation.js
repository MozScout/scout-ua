const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  item_id: {
    type: String,
    hashKey: true
  },
  full_audio_location: String,
  full_audio_date: Date,
  summary_audio_location: String,
  summary_audio_date: Date
});

const AudioFileLocation = dynamoose.model('AudioFileLocations', schema);

module.exports = AudioFileLocation;
