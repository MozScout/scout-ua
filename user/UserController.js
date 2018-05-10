const express = require('express');
const bodyParser = require('body-parser');
const ScoutUser = require('../data/models/ScoutUser');
const Database = require('../data/database');
const database = new Database();

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/scoutusers', async function(req, res) {
  try {
    const articles = await ScoutUser.scan().exec();
    res.send(articles);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.post('/scoutusers', async function(req, res) {
  try {
    await database.processScoutUser(req.body.userid, req.body.access_token);
    res.send('ok');
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
