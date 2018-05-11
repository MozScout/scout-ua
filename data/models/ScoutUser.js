const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  pocket_user_id: {
    type: String,
    hashKey: true
  },
  pocket_access_token: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: Date
});

const ScoutUser = dynamoose.model('ScoutUsers', schema);

module.exports = ScoutUser;
