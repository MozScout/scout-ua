const express = require('express');
var bodyParser = require('body-parser');
const Database = require('../data/database');
const database = new Database();
const VerifyToken = require('../VerifyToken');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Increment count for userid
router.post('/', VerifyToken, async function(req, res) {
  try {
    const count = await database.incrementUseCount(
      req.body.userid,
      req.body.use_date
    );
    res.location(`${req.originalUrl}/${req.body.pocket_user_id}`);
    res.send(count);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET count for userid
router.get('/:userid', VerifyToken, async function(req, res) {
  try {
    const count = await database.getUseCount(req.params.userid);
    res.send(count);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
