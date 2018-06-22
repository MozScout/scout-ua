const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  user_id: {
    type: String,
    hashKey: true
  },
  count: Number,
  last_use: Date
});

const UseCount = dynamoose.model('UseCount', schema);

module.exports = UseCount;
