const express = require('express');
var bodyParser = require('body-parser');
const ArticleStatusHelper = require('./ArticleStatusHelper.js');
const astatHelper = new ArticleStatusHelper();
const VerifyToken = require('../VerifyToken');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Create/update article status
router.post('/', VerifyToken, async function(req, res) {
  try {
    await astatHelper.storeArticleStatus(
      req.body.pocket_user_id,
      req.body.article_id,
      req.body.offset_ms
    );
    res.location(
      `${req.originalUrl}/${req.body.pocket_user_id}/${req.body.article_id}`
    );
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET all statuses for userid
router.get('/:userid', VerifyToken, async function(req, res) {
  try {
    const articles = await astatHelper.getArticleStatus(req.params.userid);
    res.send(articles);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET status for user/article combo
router.get('/:userid/:articleid', VerifyToken, async (req, res) => {
  try {
    const astat = await astatHelper.getArticleStatus(
      req.params.userid,
      req.params.articleid
    );
    if (astat) {
      res.send(astat);
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
