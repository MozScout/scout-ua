const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const uuidgen = require('node-uuid-generator');
const Database = require('../data/database');
const logger = require('../logger');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
const database = new Database();

router.post('/token', async function(req, res) {
  try {
    logger.info(`/register ${req.body.userid}`);
    // Lookup the API user info
    let apiUser = await database.getApiUser(req.body.userid);
    if (!apiUser) {
      return res.status(401).send('Unauthorized');
    }

    //See if the hashed passwords match
    let pwEncrypt = bcrypt.hashSync(req.body.password, 8);
    if (pwEncrypt !== apiUser.password) {
      return res.status(401).send('Unauthorized');
    }

    //This is a valid API user so create the token
    const userid = uuidgen.generate();
    const token = jwt.sign({ id: userid }, process.env.JWT_SECRET);

    //Return the token... No need to store it.
    res.status(200).send({ auth: true, token: token });
  } catch (err) {
    return res.status(500).send(`Error creating API user: ${err}`);
  }
});

module.exports = router;
