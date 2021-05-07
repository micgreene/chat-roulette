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
const users = {
  // fills in as users connect
};

// holds all of the question pulled from the trivia API
let questionsArr = [];

//create an array of users who have won the current round of a game
let winners = [];


//keep track of which game round it is
let round = 1;

userNameSp.on('connection', (socket) => {
  socket.join('lobby');
  console.log(`Welcome, socket id:${socket.id} has joined the Lobby!`);

  socket.on('login-credentials', async (payload) => {
    let reply = await basic(payload.username, payload.password);
    if (reply.error) {
      // this condition is entered if login credentials are incorrect
      console.log(reply.error.message)
      socket.emit("login-error", reply.error.message);
    } else { // there was no basic auth error, payload = user object
      addNewUser(payload.username, socket);
      socket.emit('config', payload.username);
    }
  });

  socket.on('signup-credentials', payload => {
    var user = new userModel({ username: payload.username, password: payload.password });
    user.save((err, user) => {
      if (err) {
        console.log(err.message || "Error creating new user, no error message provided")
        let message = `There was an error creating the account`;
        socket.emit('login-error', message);
        return;
      } else {
        console.log(`You have successfully created an account ${user.username}`)
      }
      addNewUser(payload.username, socket);
      socket.emit('config', payload.username);;
    })
  })
  
  // !! Logic for styling the user text, but it's not working yet
  socket.on('configs-complete', payload => {
    // assigning the style selections to the user object
    users[payload.username] = {textColor: payload.textColor, textStyle: payload.textStyle};
    
    userModel.findOneAndUpdate({username: `${payload.username}`}, {textColor: `${payload.textColor}`, textStyle: `${payload.textStyle}`}, {new: true}, (err, user) => {
      if (err) {
        console.log(err);
      } else { console.log(user);
        
        console.log('new user created:', {user});
      socket.emit('joined-server', payload.username); }
    });
  })

  // submitting a string in the terminal will automatically create a message event via repl
  socket.on('message', async payload => {
    //send message to all on server
    // socket.broadcast.emit sends to all except sender
    // io.emit sends to all sockets (but we hae a namespace)
    // socket.emit sends to 1
    let updPayload = await {
      text: payload.text,
      username: payload.username,
      textColor: users[payload.username].textColor,
      textStyle: users[payload.username].textStyle,
    }
    userNameSp.emit('message', updPayload);

    //*******************COMMANDS LIST********************/
    //----------List of Commands Users/Admins May Enter Into Terminal
    //command strings are all prefaced by **

    let newPayload = emojis(payload);

    if (newPayload) {
      socket.broadcast.emit('command', newPayload);
      socket.emit('command', newPayload);
    }

    //**authors returns the names and Linked-in urls of all team members
    if (payload.text.split('\n')[0] === '**authors') {
      let authorList = authors();
      JSON.stringify(authorList);
      socket.emit('authors', authorList);
    }

    if (payload.text.split('\n')[0] === '**shuffle') {
      shuffleUsers();
      //console.log('Rooms Breakdown: ', socket.nsp.adapter.rooms);

    }

    // **start starts the chat game logic
    if (payload.text.split('\n')[0] === '**start') {
      shuffleUsers();
      //console.log(users);
      //console.log('Rooms Breakdown: ', socket.nsp.adapter.rooms);  

      let question = questionsArr[Math.floor(Math.random() * questionsArr.length)];
      startGame(question);
    }

    try {
      if (payload.text.split('\n')[0] === users[payload.username].answer) {
        socket.emit('correct', 'Correct!');
        users[payload.username].score++;
        console.log(users[payload.username.score]);
        nextQuestion(questionsArr[Math.floor(Math.random() * questionsArr.length)]);
      }
    }
    catch {

    }
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

function emojis(payload) {
  if (payload.text.split('\n')[0] === '**lol') {
    let newPayload = {
      text: '"(^v^)"\n',
      username: payload.username
    }

    return newPayload;

  }
}

function addNewUser(username, socket) {
  //create a new User object and register its socket id, then place them in the lobby 
  users[username] = new User(username);
  users[username].room = 'lobby';
  users[username].id = socket.id;
  users[username].socket = socket;

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
  const projectAuthors = {
    darci: { name: 'Dar-Ci Calhoun     ', linkedin: 'url' },
    anne: { name: 'Anne Thorsteinson  ', linkedin: 'url' },
    cody: { name: 'Cody Carpenter     ', linkedin: 'url' },
    mike: { name: 'Michael Greene     ', linkedin: 'url' }
  };
  return projectAuthors;
}

//shuffles remaining players into new rooms when called

function shuffleUsers() {
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
        winners[i].room = roomNo;

        Object.keys(users).forEach(value => {
          if (winners[i].username === users[value].username) {
            users[value].room = roomNo;
          }
        });

        //every two players counted, the room number increases
        if (counter % 2 === 0) {
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
          counter = 1;
          roomNo++;
        } else if (counter % 2 !== 0) {
          counter++;
        }
      }
    }    
  }
}

function spliceLosers(){
  for (let i = 0; i < winners.length; i++) {
    if (winners[i].wonRound === false) {      
      winners[i].socket.leave(winners[i].room);
      winners[i].socket.join('lobby');
      Object.keys(users).forEach(value => {
        if (winners[i].username === users[value].username) {
          users[value].room = 'lobby';           
        }
      });

      winners.splice(i, 1);
      console.log('length array: ', winners.length);  
      if (winners[i] && winners[i].wonRound === false) {
        winners.splice(i, 1);
      }
         
    } 
  }
}

// function to start game logic

function startGame(question) {
  round = 1;

  Object.keys(users).forEach(value => {
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
      }, 4000);

    }, 1000);
  });

  setTimeout(() => {
    endRound();
  }, 15000);
}

async function getQuestions() {
  const url = 'https://opentdb.com/api.php?amount=50'

  await superagent.get(url)
    .then (resultData => {
      const arrayFromBody = resultData.body.results;
      Object.values(arrayFromBody).forEach(question => {
        let randomIndex = Math.floor(Math.random() * 4);
        question.all_answers = question.incorrect_answers;
        question.all_answers.splice(randomIndex, 0, question.correct_answer);
        questionsArr.push(question);
      })

      return questionsArr;
    })
}

function nextQuestion(questions) {
  Object.keys(users).forEach(value => {
    users[value].answer = questions.answer;
  });
  userNameSp.emit('nextQuestion', questions)
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

      determineWinner(player1, player2);
    }
  }
}

function determineWinner(player1, player2) {
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
        console.log('THEY LOSTWWWWWWWWWWWWWWWWWWWWWWWWWWW')
        winners[i].wonRound = false;
      }
    }
  }
  userNameSp.to(player1).emit('message', text);
  userNameSp.to(player2).emit('message', text);
  round++;

  //remove players that lost this round and move them back to the lobby
  spliceLosers();

  //when there is only 1 player left, broadcast the end of the game
  if(winners.length === 1){    
    text.text = `'************************GAME OVER!!!'************************`;
    text.textColor = 'green';
    userNameSp.emit('message', text);
    
    return gameOver(winners[0].username);    
  } 

  setTimeout(() => {
    text.text = `GET READY FOR ROUND ${round}!!!!`;
    text.textColor = 'green';

    userNameSp.to(player2).emit('message', text);

    setTimeout(() => {
      let question = mathQuestions[Math.floor(Math.random() * mathQuestions.length)];
      shuffleUsers();

      startGame(question);

    }, 1000);

  }, 3000);
}

function gameOver(winnerName){
  setTimeout(() => {
    let text = {
      text: 'WE HAVE A NEW CHAMPION!',
      username: 'SYSTEM',
      textStyle: 'underline',
      textColor: 'white'
    }
    userNameSp.emit('message', text);

    setTimeout(() => {
      text.text = `${winnerName} IS THE CHATTER MASTER!!!`
      userNameSp.emit('message', text);

      winners[0].socket.leave(winners[0].room);
      winners[0].socket.join('lobby');
      winners.pop();

      console.log('winners[] should be empty: ', winners);
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
      console.log('winners[] should be full: ', winners);
      console.log('room breakdown: ', userNameSp.adapter.rooms);

    }, 3000);
  }, 2000);
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
    socket.send({ text, username });
  },
})


console.log(`Server Listening on Port: ${port}.`)
