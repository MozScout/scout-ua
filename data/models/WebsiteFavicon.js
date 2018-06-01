const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  // Stores Favicon URL and Website name for each hostname
  hostname: {
    type: String,
    hashKey: true
  },
  favicon_url: String,
  website_name: String,
  updated_on: Date
});

const WebsiteFavicon = dynamoose.model('WebsiteFavicon', schema);

module.exports = WebsiteFavicon;
