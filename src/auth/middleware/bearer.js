'use strict';

const User = require('../models/User.js');

module.exports = async (req, res, next) => {
  try {

    if (!req.headers.authorization) { _authError() }
    const token = req.headers.authorization.split(' ').pop();
    const validUser = await User.authenticateWithToken(token);
    req.user = validUser;
    req.token = validUser.token;
    next();

  } catch (err) {
    _authError();
  }
  
  function _authError() {
    next('invalid login');
  }
}