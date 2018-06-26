const express = require('express');
const bodyParser = require('body-parser');
const ScoutUser = require('../data/models/ScoutUser');
const VerifyToken = require('../VerifyToken');
const Database = require('../data/database');
const database = new Database();
const logger = require('../logger');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/scoutusers', VerifyToken, async function(req, res) {
  try {
    const articles = await ScoutUser.scan().exec();
    res.send(articles);
  } catch (err) {
    logger.error(err);
    res.sendStatus(500);
  }
});

router.post('/scoutusers', VerifyToken, async function(req, res) {
  try {
    logger.debug(req.body);
    await database.processScoutUser(req.body.userid, req.body.access_token);
    res.send('ok');
  } catch (err) {
    logger.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
