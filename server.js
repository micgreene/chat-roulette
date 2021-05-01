'use strict';

//3rd party dependencies
const repl = require('repl');
const mathQuestions = require('./mathQuestions.js');

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

  //listens for a new user entering the chat
  socket.on('newUser', payload => {
    socket.broadcast.emit('joined-server', payload);
    socket.emit('joined-server', payload);

    // adds new user to users object to keep track of user info
    users[payload] = new User(payload);
    users[payload].id = socket.id;

    //uses current user info to create an object for the winners array
    winnerObj.username = payload;
    winnerObj.id = socket.id;
    winnerObj.socket = socket;
    winners.push(winnerObj);

    //alert server admin a new user has joined
    process.stdout.write(`${payload.username} has connected to server`);
    process.stdout.write('\r\x1b[K');
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
