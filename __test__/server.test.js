'use strict';

let server = require('../server.js');
const User = require('../user-class.js');

// const MockedSocket = require('socket.io-mock');
// let socket = new MockedSocket;

describe('====== Chatter Server ======', () => {

  it("server will replace 'lol' text with smiley face emoji", () => {
  
  let payload = { text: '**lol\n' };
  
  let test = server.emojis(payload.text);

  expect(test).toBe('"(^v^)"\n');

  });

  xit('`add new user` method will add a new user', () => {
    let users = {};
    let socket = {id: 'abc12345'};

    server.addNewUser('annie', socket);
    console.log(`add new user method: ${server.addNewUser}`);

  console.log('ANNIE: ', users['annie']);
  expect(users['annie']).toBeTruthy();

  });

  it('properly cleans the string if it contains special characters', () => {

    let testString = 'What is Mumford &amp; Son&#039;s first hit single?';
    let cleaned = server.cleanString(testString);

    expect(cleaned).toBe('What is Mumford & Son\'s first hit single?');

  });

})
