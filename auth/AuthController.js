// AuthController.js

var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
var User = require('../user/User');
var VerifyToken = require('../VerifyToken');
var mongoose = require('mongoose');
console.log('connecting to mongoose');
mongoose.connect(process.env.MONGO_STRING, {});
console.log('after connecting to mongoose');

var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');

router.post('/register', function(req, res) {
  console.log('STARTING REGISTER');
  var hashedPassword = bcrypt.hashSync(req.body.password, 8);
  console.log('AFTER HASH');
  console.log(req.body.name);

  User.create(
    {
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    },
    function(err, user) {
      if (err) {
        console.log('There was a problem registering the user');
        return res
          .status(500)
          .send('There was a problem registering the user.');
      }

      console.log('before jwt signing');
      // create a token
      var token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

      res.status(200).send({ auth: true, token: token });
    }
  );
});

router.get('/me', VerifyToken, function(req, res) {
  User.findById(
    req.userId,
    { password: 0 }, // projection
    function(err, user) {
      if (err)
        return res.status(500).send('There was a problem finding the user.');
      if (!user) return res.status(404).send('No user found.');

      res.status(200).send(user);
    }
  );
});

module.exports = router;
