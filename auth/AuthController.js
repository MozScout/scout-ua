const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const User = require('../user/User');
const VerifyToken = require('../VerifyToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const APIUser = require('../models/APIUser');
const uuidgen = require('node-uuid-generator');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

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

router.post('/register-dynamo', async function(req, res) {
  console.log('STARTING REGISTER dynamo');
  console.log(req.body.name);

  try {
    const userid = uuidgen.generate();
    const token = jwt.sign({ id: userid }, process.env.JWT_SECRET);

    const newApiUser = new APIUser({
      id: userid,
      jwt: token,
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
      active: true
    });
    await newApiUser.save();
    res.status(200).send({ auth: true, token: token });
  } catch (err) {
    return res.status(500).send(`Error creating API user: ${err}`);
  }
});

router.get('/me', VerifyToken, function(req, res) {
  console.log(req.userId);
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

router.get('/me-dynamo', VerifyToken, async function(req, res) {
  console.log(`looking up user ${req.userId}`);
  const apiuser = await APIUser.get({
    id: req.userId
  });
  if (apiuser) {
    res.status(200).send(apiuser);
  } else {
    return res.status(404).send('No user found.');
  }
});

module.exports = router;
