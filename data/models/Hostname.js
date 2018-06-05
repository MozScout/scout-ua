const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  // Stores Favicon URL and Website name for each hostname
  hostname: {
    type: String,
    hashKey: true
  },
  favicon_url: String,
  favicon_updated_on: Date,
  publisher_name: String,
  publisher_updated_on: Date
});

const Hostname = dynamoose.model('Hostname', schema);

module.exports = Hostname;
