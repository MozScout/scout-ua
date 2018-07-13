const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  /* The item_id acts as the primary key for this table and is intended to be
   * set to the article's item_id value supplied by Pocket in the titles list.
   * This ID appears to be specific to an article and is shared across
   * Pocket's users, so we can serve the same file to multiple Scout users.
   */
  item_id: {
    type: String,
    hashKey: true
  },
  intro_location: String,
  outro_location: String,
  date: Date
});

const MetaAudioLocation = dynamoose.model('MetaAudioLocation', schema);

module.exports = MetaAudioLocation;
