'use strict';

//setup environmental variables
require('dotenv').config();
const port = process.env.PORT;

//create socket.io host server and namespace for user chat
const io = require('socket.io')(port);
const userNameSp = io.of('/chatter');


//internal modules
const User = require('./user-class.js')

//create an array to hold references to each connected user
const users = {
  // fills in as users connect
};

//create an array of users who have won the current round of a game
let winner = [];

userNameSp.on('connection', (socket) => {
  console.log(`Welcome, socket id:${socket.id} has connected.`);

  socket.on('newUser', payload => {
    socket.broadcast.emit('joined-server', payload);
    socket.emit('joined-server', payload);
    // adds new user
    users[payload] = new User(payload);
    process.stdout.write(`${payload.username} has connected to server`);
    process.stdout.write('\r\x1b[K');
  })

  // after pressing enter
  socket.on('message', payload => {
    //send message to all on server
    socket.broadcast.emit('message', payload)
    socket.emit('message', payload)

    if (payload.text.split('\n')[0] === '**authors') {
      let authorList = authors();
      JSON.stringify(authorList);
      //socket.broadcast.emit('authors', authorList);
      socket.emit('authors', authorList);
    }
    // start game
    //if (payload.text.split('\n')[0] === '**start') {      
    //   Object.keys(users).forEach(value => {
    //     //assign stuff like chat log to each user here
    //   }) 
    //   startGame(socket);
    // }    
  })

  //if there is a connection problem return an error message explaining why
  io.on('connect_error', (err) => {
    console.log(`connect_error due to ${err.message}`);
  });
});

function authors() {
  const projectAuthors = {
    darci: { name: 'Dar-Ci Calhoun     ', linkedin: 'url'},
    anne: {name: 'Anne Thorsteinson  ', linkedin: 'url'},
    cody: {name: 'Cody Carpenter     ', linkedin: 'url'},
    mike: {name: 'Michael Greene     ', linkedin: 'url'}
  };
  // Object.keys(projectAuthors).forEach(value => {
  //   counter++;
  //   console.log(JSON.stringify(value), counter);
  // });
  return projectAuthors;
}

// new user joins game
function startGame(socket) {
  // resets the scores
  Object.keys(users).forEach(value => {
    users[value].score = 0;
  });

  //clears text from screen for important alerts 
  //*see user.js for 'clear' event handler
  socket.broadcast.emit('clear-terminal');
  socket.emit('clear-terminal');  
}

console.log(`Server Listening on Port: ${port}.`)