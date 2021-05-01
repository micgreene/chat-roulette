'use strict';

//3rd party dependencies
const inquirer = require('inquirer');
const mongoose = require('mongoose');
const repl = require('repl');
const mathQuestions = require('./mathQuestions.js');


//setup environmental variables
require('dotenv').config();
const port = process.env.PORT;

//create socket.io host server and namespace for user chat
const io = require('socket.io')(port);
const userNameSp = io.of('/chatter');

// Establish database connection
const dbUrl = process.env.MONGO_URL
mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });


//internal modules
const User = require('./user-class.js')
const basic = require('./src/auth/middleware/basic.js');
const userModel = require('./src/auth/models/User.js');

//create an array to hold references to each connected user
const users = {
  // fills in as users connect
};

//create an array of users who have won the current round of a game
let winners = [];

userNameSp.on('connection', (socket) => {
  //creates a new instance of the username/socket.id/socket of a new user to keep track of for the game tournament array
  let winnerObj = {
    username: null,
    id: null,
    socket: null
  }

  socket.join('lobby');
  console.log(`Welcome, socket id:${socket.id} has joined the Lobby!`);

  socket.on('login-credentials', payload => {
    basic(payload.username, payload.password);
    addNewUser(payload.username)
    socket.broadcast.emit('joined-server', payload.username );
    socket.emit('joined-server', payload.username );
  })

  socket.on('signup-credentials', payload => {
    console.log(payload);
    var user = new userModel({ username: payload.username, password: payload.password });
    user.save( (err, user) => {
      if (err) { console.log(err.message || "Error creating new user") }
      else { console.log(`You have successfully created an account ${payload.username}`) }
    })
    addNewUser(payload.username)
    socket.broadcast.emit('joined-server', { username: payload.username });
    socket.emit('joined-server', { username: payload.username });
  })

  // submitting a string in the terminal will automatically create a message event via repl
  socket.on('message', payload => {
    //send message to all on server
    socket.broadcast.emit('message', payload)
    socket.emit('message', payload)

    //*******************COMMANDS LIST********************/
    //----------List of Commands Users/Admins May Enter Into Terminal
    //command strings are all prefaced by **

    //**authors returns the names and Linked-in urls of all team members
    if (payload.text.split('\n')[0] === '**authors') {
      let authorList = authors();
      JSON.stringify(authorList);
      socket.emit('authors', authorList);
    }

    if (payload.text.split('\n')[0] === '**shuffle') {      
      shuffleUsers(socket);
      console.log('Rooms Breakdown: ', socket.nsp.adapter.rooms);      
    }

    // **start starts the chat game logic
    if (payload.text.split('\n')[0] === '**start') { 
      let question = mathQuestions[Math.floor(Math.random() * mathQuestions.length)];
      startGame(socket, question);
    }
  });

  //when a user disconnects alert server admin user has disconnected and splice the user from the winners array
  socket.on('disconnect', () =>{
    console.log(socket.id, 'was disconnected!');
    for(let i = 0; i < winners.length; i++){
      if(winners[i].id === socket.id){
        winners.splice(i,1);
      }
    }
  });

  //if there is a connection problem return an error message explaining why
  io.on('connect_error', (err) => {
    console.log(`connect_error due to ${err.message}`);
  });
});

function addNewUser(username) {
  users[username] = new User(username);
  process.stdout.write(`${username} has connected to server`);
  process.stdout.write('\r\x1b[K');
}

function authors() {
  const projectAuthors = {
    darci: { name: 'Dar-Ci Calhoun     ', linkedin: 'url'},
    anne: {name: 'Anne Thorsteinson  ', linkedin: 'url'},
    cody: {name: 'Cody Carpenter     ', linkedin: 'url'},
    mike: {name: 'Michael Greene     ', linkedin: 'url'}
  };
  
  return projectAuthors;
}

function shuffleUsers(socket){
  if(winners.length % 2 !== 0){
    socket.emit('odd-number-of-users', 'Need an EVEN number of users to shuffle rooms!');
  } else{
    let counter = 1;
    let roomNo = 0;
    for(let i = 0; i < winners.length; i++){
      winners[i].socket.leave('lobby');
      winners[i].socket.join(roomNo);
      
      if(counter % 2 === 0){
        counter = 1;
        roomNo++;
      } else if(counter % 2 !== 0){
        counter++;
      }
    }
  }
}

// function to start game logic
function startGame(socket, question) {
  socket.emit('question', question);
  // resets the scores
  Object.keys(users).forEach(value => {
    users[value].score = 0;
  });

  //clears text from screen for important alerts
  //*see user.js for 'clear' event handler
  socket.broadcast.emit('clear-terminal');
  socket.emit('clear-terminal');
}

//this evaluates all text enter into the terminal after the user hits enter :)
repl.start({
  //use this to set a prompt at the beginning of the terminal command line
  prompt: ``,
  //this is whatever text was last entered into the terminal by the user
  eval: (text) => {
    //what this does is move the cursor up to the previous line to clear the last line of text the user inputs
    //this prevents multiple lines of your own text staying in the terminal when posting your messages
    process.stdout.write('\u001b[1F');

    //this creates an automatic 'message' event using the username and text entered as the payload
    socket.send({text, username});
  },
})

console.log(`Server Listening on Port: ${port}.`)
