const chalk = require('chalk');

const print = (type, message) => {
  const date = new Date().toString();
  let typeMes;
  switch (type) {
    case 'error':
      typeMes = chalk.red('ERROR');
      break;

    case 'warn':
      typeMes = chalk.yellow('WARNING');
      break;

    case 'access':
      typeMes = 'LOG ACCESS';
      break;

    default:
      typeMes = '';
      break;
  }
  console.log(`${date}:\n${typeMes} ${message}`);
};

module.exports = print;

// node app.js > app.log 2>&1
