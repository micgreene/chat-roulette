'use strict';

let server = require('../server.js');
const User = require('../user-class.js');

const MockedSocket = require('socket.io-mock');
let socket = new MockedSocket;

 describe('======= Chatter Server ========', () => {

   // it("server will replace 'lol' text with smiley face emoji", () => {
   //
   //   let payload = { text: "**lol\n" }
   //
   //   server.emojis(payload, socket);
   //
   //
   // })

   test("that add new user will add a user", () => {
     let users = {}
     server.addNewUser("annie", socket);
     console.log("USERS", users);
     expect(users["annie"]).toBeTruthy();

   })

 })
