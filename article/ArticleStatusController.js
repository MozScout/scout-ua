const express = require('express');
var bodyParser = require('body-parser');
const ArticleStatus = require('../data/models/ArticleStatus');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/', async function(req, res) {
  try {
    const articles = await ArticleStatus.scan().exec();
    res.send(articles);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.post('/', async function(req, res) {
  try {
    const astat = new ArticleStatus({
      article_id: req.body.article_id,
      pocket_user_id: req.body.pocket_user_id,
      offset_ms: req.body.offset_ms
    });
    await astat.save();
    res.send('ok');
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.get('/:aid/:uid', async (req, res) => {
  try {
    const astat = await ArticleStatus.get({
      article_id: req.params.aid,
      pocket_user_id: req.params.uid
    });
    console.log(astat);
    res.send(astat);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
