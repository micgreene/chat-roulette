const userModel = require('../models/User.js');

module.exports = async (username, password) => {
  return userModel.authenticateBasic(username, password);
}
