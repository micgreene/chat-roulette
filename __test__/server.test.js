'use strict';

const server = require('../server.js');

const User = require('../user-class.js');

const MockedSocket = require('socket.io-mock');
let socket = new MockedSocket();

describe('====== Chatter Server ======', () => {


  it('server will replace "lol" text with smiley face emoji', () => {

    let payload = {
      text: '**lol\n',
    }

    socket.socketClient.emit
    expect(server.emojis(payload, socket).
  });

  it('will log to the server console when a new user has joined the lobby', () => {
    let spy = jest.spyOn(process.stdout.write).mockImplementation();

    let users = {
      
    };

  });

  xit();

});