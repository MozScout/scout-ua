const winston = require('winston');

const level = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
      level: level
    })
  ]
});

module.exports = logger;
