'use strict';

const user = require('../user.js');

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

// let io = require('socket.io-client');
// let io_server = require('socket.io')(3000);
// let nameSp = io_server.of('/chatter');

// describe('====== Client ======', () => {

//   let socket;

//   beforeEach((done) => {
//     socket = io.connect('http://localhost:3000/chatter', {
//       'reconnection delay': 0,
//       'reopen delay': 0,
//       'force new connection': true,
//       transports: ['websocket']
//     });

//     socket.on('connect', () => {
//       done();
//     });

//     socket.on('disconnect', () => {
//       console.log('disconnected!');
//     });
//   });

//   afterEach((done) => {
//     if(socket.connected) {
//       socket.disconnect();
//     }

//     io_server.close();
//     done();
//   });


// });

describe('====== Client App ======', () => {
  let io, serverSocket, clientSocket;

  beforeAll((done) => {
    const httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
  });

  xit('should work', (done) => {
    clientSocket.on('hello', (arg) => {
      expect(arg).toBe('world');
      done();
    });
    serverSocket.emit('hello', 'world');
  });

  it('will successfully validate a password when a user registers', () => {
    let testPw1 = 'qwerty12!';

    let result1 = user.validatePassword(testPw1);

    expect(result1).toBe(true);

    let testPw2 = 'Qer45$';

    let result2 = user.validatePassword(testPw2);

    expect(result2).toBe('not enough characters; ');

    let testPw3 = 'Qer45453';

    let result3 = user.validatePassword(testPw3);

    expect(result3).toBe('password must have at least one symbol');

    let testPw4 = '#$%^@&#$';

    let result4 = user.validatePassword(testPw4);

    expect(result4).toBe('password must have at least one letter; password must have at least one number; ');
  });

  it('client will alert user that their app successfully joined the server', () => {
    let consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    
    clientSocket.on('joined-server', user.joinSrvResp);
    
    io.emit('joined-server', 'Harold');

    setTimeout(() => {

      expect(consoleSpy).toHaveBeenCalled();
    }, 5000);

    consoleSpy.mockRestore();
  });
});