var mongoose = require('mongoose');  
var uniqueValidator = require('mongoose-unique-validator');

var ScoutUserSchema = new mongoose.Schema({  
  userid: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
  access_token: String
}, {timestamps: true});
mongoose.model('ScoutUser', ScoutUserSchema);
ScoutUserSchema.plugin(uniqueValidator, {message: 'is already taken.'});
console.log('after creating mongoose model');

module.exports = mongoose.model('ScoutUser');