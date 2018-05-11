const express = require('express');
var bodyParser = require('body-parser');
const ArticleStatus = require('../data/models/ArticleStatus');
const VerifyToken = require('../VerifyToken');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

// Create/update article status
router.post('/', VerifyToken, async function(req, res) {
  try {
    const astat = new ArticleStatus({
      pocket_user_id: req.body.pocket_user_id,
      article_id: req.body.article_id,
      offset_ms: req.body.offset_ms
    });
    await astat.save();
    res.send('ok');
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET all statuses for userid
router.get('/:userid', VerifyToken, async function(req, res) {
  try {
    const articles = await ArticleStatus.query({
      pocket_user_id: req.params.userid
    }).exec();
    res.send(articles);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// GET status for user/article combo
router.get('/:userid/:articleid', VerifyToken, async (req, res) => {
  try {
    const astat = await ArticleStatus.get({
      pocket_user_id: req.params.userid,
      article_id: req.params.articleid
    });
    console.log(astat);
    res.send(astat);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
