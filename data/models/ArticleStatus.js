const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  article_id: {
    type: String,
    hashKey: true
  },
  pocket_user_id: {
    type: String,
    rangeKey: true
  },
  offset_ms: Number
});

const ArticleStatus = dynamoose.model('ArticleStatus', schema);

module.exports = ArticleStatus;
