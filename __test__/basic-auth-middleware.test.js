'use strict';

require('@code-fellows/supergoose');
const basicAuth = require('../src/auth/middleware/basic.js');
const userModel = require('../src/auth/models/User.js');

let validUser = { username: 'user1', password: 'user1pass' };

let invalidUser = { username: 'user1', password: '' }

// add a valid user to the db
beforeAll( async (done) => {
  await new userModel(validUser).save();
  done();
})

describe ("BASIC AUTH middleware function", () => {

  test("that login fails for a non existant user with correct error message", async () => {
    await basicAuth("John", "")
      .then(reply => {
        expect(reply.error).toBeTruthy();
        expect(reply.error.message).toEqual('Username not found');
      })
  })

  test("that login fails for an existing user with the wrong password and returns the expected error message", async () => {
    await basicAuth(invalidUser.username, invalidUser.password)
    .then(reply => {
      expect(reply.error).toBeTruthy();
      expect(reply.error.message).toEqual("Invalid password")
    })
  })

  test("that you can successfully sign in with valid inputs", async () => {
    await basicAuth(validUser.username, validUser.password)
    .then(reply => {
      expect(reply.error).toBeFalsy();
      expect(reply).toBeTruthy();
      expect(reply.username).toEqual(validUser.username);
      // we expect the following text to fail bc the plain text password should NOT equal the stored/hashed version
      expect(reply.password).not.toEqual(validUser.password);
    })
  })

})
