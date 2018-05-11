const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  id: {
    type: String,
    hashKey: true
  },
  jwt: String,
  name: String,
  email: String,
  password: String,
  active: Boolean
});

const APIUser = dynamoose.model('APIUsers', schema);

module.exports = APIUser;
