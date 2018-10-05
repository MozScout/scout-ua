const jwt = require('jsonwebtoken');
const uuidgen = require('node-uuid-generator');

if (process.argv.length <= 2) {
  console.log('Usage: ' + __filename + ' <secret string>');
  process.exit(-1);
}

var secret = process.argv[2];

const userid = uuidgen.generate();
const token = jwt.sign({ id: userid }, secret);

console.log('Token is: ' + token);
