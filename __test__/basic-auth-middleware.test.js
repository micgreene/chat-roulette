'use strict';

const supergoose = require('@code-fellows/supergoose');
const server  = require('../server.js')
const basicAuth = require('../src/auth/middleware/basic.js');
const userModel = require('../src/auth/models/User.js');

let validUser ={ username: 'user1', password: 'user1pass' };

let invalidUser = { username: 'invalid', password: '' }

// add a valid user to the db
beforeAll( async () => {
  await new userModel(validUser);
})

describe ("BASIC AUTH middleware function", () => {

  test("that login fails for a non existant user", async () => {
    await basicAuth("John", "")
      .then(reply => {
        expect(reply.error).toBeTruthy();
      })
  })


})
