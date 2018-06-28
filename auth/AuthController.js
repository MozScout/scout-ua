const express = require('express');
const bodyParser = require('body-parser');
const VerifyToken = require('../VerifyToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const uuidgen = require('node-uuid-generator');
const APIUser = require('../data/models/APIUser');
const logger = require('../logger');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

router.post('/register', async function(req, res) {
  try {
    logger.info(`/register ${req.body.name}`);
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

router.get('/me', VerifyToken, async function(req, res) {
  logger.info(`looking up user ${req.userId}`);
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
