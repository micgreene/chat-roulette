'use strict';

const { countdown } = require('./src/gameLogic/game-control.js');
const { authors, emojis } = require('./src/gameLogic/display.js');
const login = require('./src/login/login.js');
const { cleanString } = require('./src/gameLogic/api-control.js');

//3rd party dependencies
const inquirer = require('inquirer');
const mongoose = require('mongoose');
const repl = require('repl');
const superagent = require('superagent');

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
var users = {};

// holds all of the question pulled from the trivia API
let questionsArr = [];

//create an array of users who have won the current round of a game
let winners = [];
let losers = [];
let roomList = [];

//keep track of which game round it is
let round = 0;

//fill questions array
getQuestions();

userNameSp.on('connection', (socket) => {

  socket.join('lobby');
  console.log(`Socket id:${socket.id} has joined the Lobby!`);

  socket.on('login-credentials', async (payload) => {
    let loggedInUser = await basic(payload.username, payload.password);
    if (loggedInUser.error) {
      console.log(loggedInUser.error.message)
      socket.emit("login-error", loggedInUser.error.message);
    } else {
      addNewUser(loggedInUser, socket);
      socket.emit('joined-server', loggedInUser.username);
    }
  });

  socket.on('signup-credentials', payload => {
    var newUser = new userModel({ username: payload.username, password: payload.password });
    newUser.save((err, user) => {
      if (err) {
        console.log(err.message || "Error creating new user, no error message provided")
        let message = `There was an error creating the account`;
        socket.emit('login-error', message);
        return;
      } else {
        console.log(`You have successfully created an account ${user.username}`)
      }
      addNewUser(newUser, socket);
      socket.emit('config', payload.username);;
    })
  })

  socket.on('configs-complete', payload => {
    // assigning the style selections to the user object
    users[payload.username].textColor = payload.textColor;
    users[payload.username].textStyle = payload.textStyle;
    userModel.findOneAndUpdate({username: `${payload.username}`}, {textColor: `${payload.textColor}`, textStyle: `${payload.textStyle}`}, {new: true}, (err, user) => {
      if (err) {
        console.log(err);
      } else {
        socket.emit('joined-server', payload.username);
      }
    });
  })

  // submitting a string in the terminal will automatically create a message event via repl
  socket.on('message', async payload => {

    if (!users[payload.username]) {
      users[payload.username] = await userModel.findOne({ username: `${payload.username}` });
    }

    // *******************COMMANDS LIST********************/
    // ----------List of Commands Users/Admins May Enter Into Terminal
    // command strings are all prefaced by **

    //**authors returns the names and Linked-in urls of all team members
    if (payload.text.split('\n')[0] === '**authors') {
      let authorList = authors();
      JSON.stringify(authorList);
      socket.emit('authors', authorList);
    }

    if (payload.text.split('\n')[0] === '**shuffle') {
      shuffleUsers();
    }

    // **start starts the chat game logic
    if (payload.text.split('\n')[0] === '**start') {
      shuffleUsers();
      startGame();
      nextRound();
    }

    if (payload.text.split('\n')[0] === users[payload.username].answer) {
      userNameSp.in(users[payload.username].room).emit('correct', `Correct answer ${payload.username}!`);
      users[payload.username].score++;
      nextQuestion(users[payload.username].room);
    }

    let updPayload = {
      text: emojis(payload.text),
      username: payload.username,
      textColor: users[payload.username].textColor,
      textStyle: users[payload.username].textStyle,
    }

    // need to send only to the room the person is in
    userNameSp.in(users[payload.username].room).emit('message', updPayload);

  })

  //when a user disconnects alert server admin user has disconnected and splice the user from the winners array
  socket.on('disconnect', () => {
    console.log(socket.id, 'was disconnected!');
    for (let i = 0; i < winners.length; i++) {
      if (winners[i].id === socket.id) {
        winners.splice(i, 1);
      }
    }
  });

  //if there is a connection problem return an error message explaining why
  io.on('connect_error', (err) => {
    console.log(`connect_error due to ${err.message}`);
  });
});


function addNewUser(userObject, socket) {
  let username = userObject.username;
  users[username] = new User(username);
  users[username].room = 'lobby';
  users[username].id = socket.id;
  users[username].socket = socket;
  users[username].textColor = userObject.textColor;
  users[username].textStyle = userObject.textStyle;
  users[username].active = true;
  winners.push(users[username]);

  //alert the admin that a new user has joined
  process.stdout.write(`${username} has connected to server`);
  process.stdout.write('\r\x1b[K');
}





// all this does is reset scores to zero and emit a message to the user
// that the game is going to start
function startGame() {
  round++;
  let text = {
    text: '************************GAME START!!!************************\n',
    username: 'SYSTEM',
    textStyle: 'bold',
    textColor: 'green'
  };
  roomList.forEach( room => {
    userNameSp.to(room).emit('message', text);
    startQuestions(room);
  })
}

function startQuestions(room) {
  nextQuestion(room);
  setTimeout(() => {
    console.log("ENTERED SET TIMEOUT!!!");
    endRound(); // ends round, calls determine winner
  }, 15*1000);
}

function nextQuestion(room) {
  let question = questionsArr[Math.floor(Math.random() * questionsArr.length)];
  console.log(question.correct_answer);
  // this should only happen for users in the room
  // find the users where room === room
  Object.keys(users).forEach(user => {
    if (users[user].room === room) {
      users[user].answer = question.correct_answer;
    }
  });
  userNameSp.to(room).emit('nextQuestion', question)
}

// this happens for all the rooms at once
function endRound() {
  let text = {
    text: '************************ROUND OVER!!!************************\n',
    username: 'SYSTEM', textStyle: 'green', textColor: 'bold'
  };

  let currUsers = [];
  let currRoom;
  // loop through rooms, get player names
  // pass player objects to determine winner
  for (let i = 0; i < roomList.length; i++) {
    currRoom = roomList[i];
    currUsers = [];
    Object.keys(users).forEach(user => {
      if (users[user].room === currRoom) {
        users[user].answer = null;
        currUsers.push(user);
      }
    })
    console.log("current users", currUsers);
    userNameSp.to(currRoom).emit('message', text);
    determineWinner(currUsers[0], currUsers[1], currRoom)
  }
}

function determineWinner(player1, player2, currRoom) {
  if (!player1 || !player2) {
    return;
  }
  let winner = (users[player1].score > users[player2].score) ? player1 : player2;
  let loser = winner === player1 ? player2 : player1;

  // send a message to the room about the winner
  let text = { text: '', username: 'SYSTEM', textStyle: 'bold', textColor: 'red' }
  text.text = `* - * - * - * - * ${winner} * - * - * - * - * HAS WON ROUND ${round}!!!`;
  userNameSp.to(currRoom).emit('message', text);

  console.log("LOSER IS", loser);
  users[loser].active = false;
  users[loser].socket.leave(currRoom);
  users[loser].room = 'lobby';
  users[loser].socket.join('lobby');

  winners = [];
  Object.keys(users).filter(user => {
    if (users[user].active) {
       return winners.push(users[user])
     }
   })

  console.log("winners array after loser is removed", winners.length);
  if (winners.length === 1) {
    gameOver(winners[0]);
  }

}

function nextRound() {
  if (winners.length === 1) {
    console.log("ENTERING END OF GAME !!!!!!!!!!!!!!!!!!")
    gameOver(winners[0]);
  } else {
    // otherwise shuffle the winners into new rooms
    console.log("ENTERING SUBSEQUENT ROUNDS");
    shuffleUsers();
    startGame();
  }
}

function gameOver (userObject){
    let text = { text: 'WE HAVE A NEW CHAMPION!\n', username: 'SYSTEM',
      textStyle: 'bold', textColor: 'red' }
    userNameSp.emit('message', text);
    text.text = `${userObject.username} IS THE CHATTER MASTER!!!\n`;
    userNameSp.emit('message', text);

    text = { text: 'Let\'s Play Again Sometime!', textColor: 'green',
      textStyle: 'bold', username: 'SYSTEM'}
    userNameSp.emit('message', text);

    // send everyone back to the lobby
    Object.keys(users).forEach(user => {
      users[user].room = 'lobby';
    })

    let username = userObject.username;
    users[username].socket.leave(userObject.room);
    users[username].socket.join('lobby');
    users[username].socket.emit('message', { username: 'SYSTEM', text: 'Moved to Room: Lobby', textColor: 'green', textStyle: 'bold' })

}

async function getQuestions() {
  const url = 'https://opentdb.com/api.php?amount=50'

  await superagent.get(url)
    .then ( resultData => {
      const arrayFromBody = resultData.body.results;
      Object.values(arrayFromBody).forEach(question => {
        question.question = cleanString(question.question);
        let randomIndex = Math.floor(Math.random() * 4);
        question.all_answers = question.incorrect_answers;
        question.correct_answer = cleanString(question.correct_answer);
        question.all_answers.splice(randomIndex, 0, question.correct_answer);
        question.all_answers.forEach(function(question, index) {
          this[index] = cleanString(question);
        }, question.all_answers)
        questionsArr.push(question);
      })
      return questionsArr;
    })
}

function shuffleUsers() {
  // everyone back to the lobby before the next shuffle
  Object.keys(users).forEach(username => {
    users[username].score = 0;
    users[username].socket.leave(users[username].room);
    users[username].room = 'lobby';
    users[username].socket.join('lobby');
  })

  // add only active users to the winners arrays
  winners = [];
  Object.keys(users).filter(user => {
    if (users[user].active) {
       return winners.push(users[user])
     }
   })
   console.log("winners length at outset", winners.length);

  roomList = [];

  let text = { text: '', username: 'SYSTEM', textStyle: 'bold', textColor: 'green' };
  if (winners.length === 0) { console.log('Error: winners[] array is empty!'); }
  if (winners.length % 2 > 0) {
    userNameSp.emit('odd-number-of-users', 'Need an EVEN number of users to shuffle rooms!');
    return;
  }

  for (let i = 0; i < winners.length; i+=2) {
    roomList.push(i);
    let currUser = winners[i];
    let nextUser = winners[i+1];
    users[currUser.username].socket.leave(currUser.room);
    users[nextUser.username].socket.leave(nextUser.room);
    users[currUser.username].socket.join(i);
    users[nextUser.username].socket.join(i);
    users[currUser.username].room = i;
    users[nextUser.username].room = i;
    text.text = `Moved to Room: ${i}\n`;
    userNameSp.to(i).emit('message', text);
    console.log(`${currUser.username} VS ${nextUser.username} in ROOM ${i}`);
    console.log("curr user room", currUser.room, "next user room", nextUser.room);
  }

}

console.log(`Server Listening on Port: ${port}.`)

module.exports = {
  addNewUser: addNewUser,
  emojis: emojis,
}
