'use strict';

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
let roomList = [];

//keep track of which game round it is
let round = 1;

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

  // !! Logic for styling the user text, but it's not working yet
  socket.on('configs-complete', payload => {
    // assigning the style selections to the user object
    users[payload.username].textColor = payload.textColor;
    users[payload.username].textStyle = payload.textStyle;

    userModel.findOneAndUpdate({ username: `${payload.username}` }, { textColor: `${payload.textColor}`, textStyle: `${payload.textStyle}` }, { new: true }, (err, user) => {
      if (err) {
        console.log(err);
      } else {
        console.log(user);

        console.log('new user created:', { user });
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

    // **start starts the chat game logic
    if (payload.text.split('\n')[0] === '**start') {
      shuffleUsers();
      //console.log(users);
      //console.log('Rooms Breakdown: ', socket.nsp.adapter.rooms);
      let question = questionsArr[Math.floor(Math.random() * questionsArr.length)];
      startGame(question);
    }

    if (users[payload.username].answer) {
      if (payload.text.split('\n')[0] === users[payload.username].answer) {
        userNameSp.in(users[payload.username].room).emit('correct', 'Correct!');
        users[payload.username].score++;

        let question = questionsArr[Math.floor(Math.random() * questionsArr.length)];
        nextQuestion(question, payload.username);
      }
    }

    let updPayload = {
      text: emojis(payload.text),
      username: payload.username,
      textColor: users[payload.username].textColor,
      textStyle: users[payload.username].textStyle,
    }
    userNameSp.emit('message', updPayload);

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

function emojis(text) {
  if (text.split('\n')[0] === '**lol') {
    return '"(^v^)"\n'
  } else {
    return text
  }
}

function addNewUser(userObject, socket) {
  let username = userObject.username;
  users[username] = new User(username);
  users[username].room = 'lobby';
  users[username].id = socket.id;
  users[username].socket = socket;
  users[username].textColor = userObject.textColor;
  users[username].textStyle = userObject.textStyle;

  // creates a new instance of the username/socket.id/socket of a new user to keep track of for the game tournament array
  let winnerObj = {
    username: null,
    id: null,
    socket: null,
    room: null,
    wonRound: true
  }
  //create a new player object for the game start and place them in an array
  //this 'winners' array will keep track of players who have yet to be eliminated
  winnerObj.username = username;
  winnerObj.id = socket.id;
  winnerObj.socket = socket;
  winners.push(winnerObj);

  //alert the admin that a new user has joined
  process.stdout.write(`${username} has connected to server`);
  process.stdout.write('\r\x1b[K');
}

//keeps a list of devs for the project and their contact info
function authors() {
  const lIn = `https://www.linkedin.com/in/`
  const projectAuthors = {
    darci: { name: 'Dar-Ci Calhoun     ', linkedin: `${lIn}dlcalhoun` },
    anne: { name: 'Anne Thorsteinson  ', linkedin: `${lIn}annethor` },
    cody: { name: 'Cody Carpenter     ', linkedin: `${lIn}callmecody` },
    mike: { name: 'Michael Greene     ', linkedin: `${lIn}michael-greene-b7879774/`}
  };
  return projectAuthors;
}

//shuffles remaining players into new rooms when called

function shuffleUsers() {
  roomList = [];
  let text = {
    text: '',
    username: 'SYSTEM',
    textStyle: 'bold',
    textColor: 'green'
  };

  if (winners.length === 0) {
    console.log('Error: winners[] array is empty!');
  }

  if (winners.length % 2 !== 0) {
    userNameSp.emit('odd-number-of-users', 'Need an EVEN number of users to shuffle rooms!');
  } else {
    let counter = 1;
    let roomNo = 0;

    if (round === 1) {
      for (let i = 0; i < winners.length; i++) {
        winners[i].socket.leave('lobby');
        winners[i].socket.join(roomNo);

        text.text = `Moved to Room: ${roomNo}\n`;
        winners[i].socket.emit('message', text);
        winners[i].room = roomNo;

        Object.keys(users).forEach(value => {
          if (winners[i].username === users[value].username) {
            users[value].room = roomNo;
          }
        });

        //every two players counted, the room number increases
        if (counter % 2 === 0) {
          roomList.push(roomNo);
          counter = 1;
          roomNo++;
        } else if (counter % 2 !== 0) {
          counter++;
        }
      }
    } else {
      for (let i = 0; i < winners.length; i++) {
        winners[i].socket.leave(winners[i].room);
        winners[i].socket.join(roomNo);

        Object.keys(users).forEach(value => {
          if (winners[i].username === users[value].username) {
            users[value].room = roomNo;
          }
        });

        //every two players counted, the room number increases
        if (counter % 2 === 0) {
          roomList.push(roomNo);
          counter = 1;
          roomNo++;
        } else if (counter % 2 !== 0) {
          counter++;
        }
      }
    }
  }

  console.log('end of Shuffle() - List of Rooms: ', roomList);
}

let countSplice = 1;
function spliceLosers() {
  console.log('spliceLosers Called: ', countSplice, ' Time(s).');
  countSplice++;
  let text = {
    text: '',
    username: 'SYSTEM',
    textStyle: 'bold',
    textColor: 'green'
  };

  let losers = winners.filter(user=>{
    return user.wonRound === false;
  });

  winners = winners.filter(user=>{
    return user.wonRound === true;
  });

  losers.forEach(user=>{
    user.socket.leave(user.room);
    user.socket.join('lobby');
    text.text = `You Lose!`;
    user.socket.emit('message', text);
    text.text = `Moving Back to Room: Lobby\n`;
    user.socket.emit('message', text);
    users[user.username].room = 'lobby';  
  });    
}

// function to start game logic
function startGame(question) {
  if (winners.length % 2 === 0) {
    round = 1;
    Object.keys(users).forEach(value => {
      if (users[value].room !== 'lobby') {
        //clears text from screen for important alerts
        //*see user.js for 'clear' event handler
        //userNameSp.to(users[value].id).emit('clear-terminal', question);

        // assigns a correct answer to the player
        users[value].answer = question.correct_answer;

        // resets the scores
        users[value].score = 0;
        let text = {
          text: '************************GAME START!!!************************\n',
          username: 'SYSTEM',
          textStyle: 'bold',
          textColor: 'green'
        };

        setTimeout(() => {
          userNameSp.to(users[value].id).emit('message', text);
          countdown(users[value].id);



          setTimeout(() => {
            userNameSp.to(users[value].id).emit('question', question);
            console.log(question.correct_answer);
          }, 4000);
        }, 1000);
      }
    });

    setTimeout(() => {
      endRound();
    }, 30000);
  }
}

async function getQuestions() {
  const url = 'https://opentdb.com/api.php?amount=50'

  await superagent.get(url)
    .then(resultData => {
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

function nextQuestion(question, username) {
  userNameSp.to(users[username].room).emit('nextQuestion', question);
  console.log(question.correct_answer);
}

function countdown(id) {

  let text = {
    text: '3\n',
    username: 'SYSTEM',
    textStyle: 'green',
    textColor: 'bold'
  };

  setTimeout(() => {
    userNameSp.to(id).emit('message', text);
    text.text = '2\n';

    setTimeout(() => {
      userNameSp.to(id).emit('message', text);
      text.text = '1\n';

      setTimeout(() => {
        userNameSp.to(id).emit('message', text);
      }, 1000);

    }, 1000);

  }, 1000);
}

function endRound() {
  let text = {
    text: '************************ROUND OVER!!!************************\n',
    username: 'SYSTEM',
    textStyle: 'green',
    textColor: 'bold'
  };

  for (let i = 0; i < userNameSp.adapter.rooms.size; i++) {
    let player1 = null;
    let player2 = null;

    if (userNameSp.adapter.rooms.get(i)) {
      let counter = 0;
      userNameSp.adapter.rooms.get(i).forEach(value => {
        if (counter === 0) {
          player1 = value;
        } else if (counter === 1) {
          player2 = value;
        }
        counter++;
        userNameSp.to(value).emit('message', text);
      });

      
      (player1 && player2) && determineWinner(player1, player2);
    }
  }
}

function determineWinner(player1, player2) {
  // console.log('Times dW ran: ', countWinnerFunc);
  // countWinnerFunc++;
  let player1Name = null;
  let player2Name = null;
  Object.keys(users).forEach(value => {
    if (player1 === users[value].id) {
      player1Name = users[value].username;
    }
    if (player2 === users[value].id) {
      player2Name = users[value].username;
    }
  });

  console.log('determineWinner() - player1 name: ', player1);
  console.log('determineWinner() - player2 name: ', player2);
  users[player1Name].answer = null;
  users[player2Name].answer = null;

  let winner = null;
  let text = {
    text: '',
    username: 'SYSTEM',
    textStyle: 'underline',
    textColor: 'white'
  }

  if (users[player1Name].score > users[player2Name].score) {
    winner = player1Name;
    text.text = `${player1Name} HAS WON ROUND ${round}!!!`;
    users[player1Name].highScore += users[player1Name].score;

    for (let i = 0; i < winners.length; i++) {
      if (winners[i].username === player2Name) {
        winners[i].wonRound = false;
      }
    }

  } else {
    winner = player2Name;
    text.text = `${player2Name} HAS WON ROUND ${round}!!!`
    users[player2Name].highScore += users[player2Name].score;

    for (let i = 0; i < winners.length; i++) {
      if (winners[i].username === player1Name) {
        winners[i].wonRound = false;
      }
    }
  }
  userNameSp.to(player1).emit('message', text);
  userNameSp.to(player2).emit('message', text);
  round++;

  //remove players that lost this round and move them back to the lobby
  console.log('determineWinner() - winners array before spliceLosers: ', winners);
  spliceLosers();
  console.log('determineWinner() - winners array after spliceLosers: ', winners);

  console.log('determineWinner() - winners array length after spliceLosers: ', winners.length);
  //when there is only 1 player left, broadcast the end of the game
  if(winners.length === 1){
    text.text = `'************************GAME OVER!!!'************************`;
    text.textColor = 'green';
    userNameSp.emit('message', text);

    return gameOver(winners[0].username);
  } else {
    console.log('We should NOT be here', winners.length);
    // setTimeout(() => {
      text.text = `GET READY FOR ROUND ${round}!!!!`;
      text.textColor = 'green';

      Object.keys(users).forEach(value => {
        if (users[value].username === player1Name) {
          userNameSp.to(player1).emit('message', text);
        }
        if (users[value].username === player2Name) {
          userNameSp.to(player2).emit('message', text);
        }
      });      

      // setTimeout(() => {
        let question = questionsArr[Math.floor(Math.random() * questionsArr.length)];
        shuffleUsers();

        startGame(question);

      // }, 1000);

    // }, 3000);
  }
}

function gameOver(winnerName) {
  console.log(`GAME OVER ${winnerName}`);
  setTimeout(() => {
    let text = {
      text: 'WE HAVE A NEW CHAMPION!\n',
      username: 'SYSTEM',
      textStyle: 'underline',
      textColor: 'white'
    }
    userNameSp.emit('message', text);

    setTimeout(() => {
      text.text = `${winnerName} IS THE CHATTER MASTER!!!\n`;
      userNameSp.emit('message', text);

      text.textStyle = 'bold';
      text.textColor = 'green';
      text.text = `Let's Play Again Sometime!`;
      userNameSp.emit('message', text);

      winners[0].socket.leave(winners[0].room);
      winners[0].socket.join('lobby');
      winners.pop();

      text.text = `Moved to Room: Lobby`;
      text.textColor = 'green';
      text.textStyle = 'bold';
      users[winnerName].socket.emit('message', text);

      Object.keys(users).forEach(value => {
        let winnerObj = {
          username: null,
          id: null,
          socket: null,
          room: 'lobby',
          wonRound: true
        }
        //create a new player object for the game start and place them in an array
        //this 'winners' array will keep track of players who have yet to be eliminated
        winnerObj.username = users[value].username;
        winnerObj.id = users[value].id;
        winnerObj.socket = users[value].socket;
        winners.push(winnerObj);
      });
      console.log('room breakdown: ', userNameSp.adapter.rooms);

    }, 3000);
  }, 2000);
}

function cleanString(string) {
  let amp = /&amp;/g;
  let quote = /&quot;/g;
  let apost = /&#039;/g;
  let apos = /&apos;/g;
  let degree = /&deg;/g;
  return string.replace(amp, "&")
               .replace(quote, "\"")
               .replace(apos, "\'")
               .replace(degree, ' degrees')
               .replace(apost, '\'');
}

console.log(`Server Listening on Port: ${port}.`)
