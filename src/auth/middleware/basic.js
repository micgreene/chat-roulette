const base64 = require('base-64');
const userModel = require('../models/User.js');

module.exports = async (username, password) => {
  // console.log("inside basic", username, password);
  let user = await userModel.findOne({ username: username }, function (err, user) {
    if (err) {
      console.log('Database error');
    }
    if (user === null) {
      console.log('No such user found');
    } else {
      //test if the password matches
      userModel.authenticateBasic(username, password, function(err, user) {
        console.log("valid in basic.js", user);
        if (err) {
          console.log(err.message || 'Database error' );
        } else {
          if (user) {
            console.log(`Successful login ${user.username}`)
          } else {
            console.log('Incorrect login credentials');
          }
        }
      })
    }
  });
}
