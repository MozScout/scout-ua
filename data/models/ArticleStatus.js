const dynamoose = require('dynamoose');

const schema = new dynamoose.Schema({
  pocket_user_id: {
    type: String,
    hashKey: true
  },
  article_id: {
    type: String,
    rangeKey: true
  },
  offset_ms: Number
});

const ArticleStatus = dynamoose.model('ArticleStatus', schema);

module.exports = ArticleStatus;
