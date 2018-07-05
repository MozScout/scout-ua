const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  id: {
    type: String,
    hashKey: true
  },
  userid: String,
  password: String,
  active: Boolean
});

const APIUser = dynamoose.model('APIUsers', schema);

module.exports = APIUser;
