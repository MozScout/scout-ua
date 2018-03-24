var mongoose = require('mongoose');  
var UserSchema = new mongoose.Schema({  
  name: String,
  email: String,
  password: String
});
console.log('after creating user scheme');
mongoose.model('User', UserSchema);
console.log('after creating mongoose model');

module.exports = mongoose.model('User');