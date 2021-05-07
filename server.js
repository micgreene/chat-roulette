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

getQuestions()
  .then( () => {
    console.log(questionsArr);
  })

userNameSp.on('connection', (socket) => {

  //creates a new instance of the username/socket.id/socket of a new user to keep track of for the game tournament array
  let winnerObj = {
    username: null,
    id: null,
    socket: null
  }

  socket.join('lobby');
  console.log(`Welcome, socket id:${socket.id} has joined the Lobby!`);

  socket.on('login-credentials', async (payload) => {
    let reply = await basic(payload.username, payload.password);
    if (reply.error) {
      // this condition is entered if login credentials are incorrect
      console.log(reply.error.message)
      socket.emit("login-error", reply.error.message);
    } else { // there was no basic auth error, payload = user object
      addNewUser(payload.username, socket)
      winnerObj.username = payload.username;
      winnerObj.id = socket.id;
      winnerObj.socket = socket;
      winners.push(winnerObj);
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
        console.log(`You have successfully created an account ${payload.username}`)
      }
      addNewUser(payload.username, socket);
      // socket.emit('config', payload.username);
      socket.emit('config', payload.username);
    })
  })

  // !! Logic for styling the user text, but it's not working yet
  socket.on('configs-complete', payload => {
    // assigning the style selections to the user object
    users[payload.username].textStyle = payload.textStyle;
    users[payload.username].textColor = payload.textColor;
    socket.emit('joined-server', payload.username);
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

    emojis(payload, socket);

    //**authors returns the names and Linked-in urls of all team members
    if (payload.text.split('\n')[0] === '**authors') {
      let authorList = authors();
      JSON.stringify(authorList);
      socket.emit('authors', authorList);
    }

    if (payload.text.split('\n')[0] === '**shuffle') {
      shuffleUsers(socket, payload.username);
      //console.log('Rooms Breakdown: ', socket.nsp.adapter.rooms);

    }

    // **start starts the chat game logic
    if (payload.text.split('\n')[0] === '**start') {
      shuffleUsers(socket, payload.username);
      console.log(users);
      //console.log('Rooms Breakdown: ', socket.nsp.adapter.rooms);

      let question = questionsArr[Math.floor(Math.random() * questionsArr.length)];
      startGame(socket, question);
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

function emojis(payload, socket) {
  if (payload.text.split('\n')[0] === '**lol') {
    let newPayload = {
      text: '"(^v^)"\n',
      username: payload.username

    }

    socket.broadcast.emit('command', newPayload);
    socket.emit('command', newPayload);
  }
}

function addNewUser(username, socket) {
  users[username] = new User(username);
  users[username].room = 'lobby';
  users[username].id = socket.id;
  process.stdout.write(`${username} has connected to server`);
  process.stdout.write('\r\x1b[K');
}

function authors() {
  const projectAuthors = {
    darci: { name: 'Dar-Ci Calhoun     ', linkedin: 'url' },
    anne: { name: 'Anne Thorsteinson  ', linkedin: 'url' },
    cody: { name: 'Cody Carpenter     ', linkedin: 'url' },
    mike: { name: 'Michael Greene     ', linkedin: 'url' }
  };

  return projectAuthors;
}

function shuffleUsers(socket, username) {
  if (winners.length === 0) {
    console.log('Error: winners[] array is empty!');
  }

  if (winners.length % 2 !== 0) {
    socket.emit('odd-number-of-users', 'Need an EVEN number of users to shuffle rooms!');
  } else {
    let counter = 1;
    let roomNo = 0;
    for (let i = 0; i < winners.length; i++) {
      winners[i].socket.leave('lobby');
      winners[i].socket.join(roomNo);

      Object.keys(users).forEach(value => {
        if (winners[i].username === users[value].username) {
          users[value].room = roomNo;
        }
      });

      if (counter % 2 === 0) {
        counter = 1;
        roomNo++;
      } else if (counter % 2 !== 0) {
        counter++;
      }
    }
  }
}

// function to start game logic

function startGame(socket, question) {

  Object.keys(users).forEach(value => {
    //clears text from screen for important alerts
    //*see user.js for 'clear' event handler
    //userNameSp.to(users[value].id).emit('clear-terminal', question);

    // assigns a correct answer to the player
    users[value].answer = question.correct_answer;

    // resets the scores
    users[value].score = 0;
    let text = {
      text: '********************GAME START!!!********************\n',
      username: 'SYSTEM',
      textStyle: users[value].textStyle,
      textColor: users[value].textColor
    };

    setTimeout(()=>{
      userNameSp.to(users[value].id).emit('message', text);
      countdown(users[value].id);

      setTimeout(()=>{
        userNameSp.to(users[value].id).emit('question', question);
      }, 4000);

    }, 1000);
  });
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
    users[value].answer = questions.correct_answer;
  })
  userNameSp.emit('nextQuestion', questions)
}


function countdown(id){
  let text = {
    text: '3\n',
    username: 'SYSTEM',
    textStyle: 'green',
    textColor: 'bold'
  };

  setTimeout(()=>{
    userNameSp.to(id).emit('message', text);
    text.text = '2\n';

    setTimeout(()=>{
      userNameSp.to(id).emit('message', text);
      text.text = '1\n';

      setTimeout(()=>{
        userNameSp.to(id).emit('message', text);
      }, 1000);

    }, 1000);

  }, 1000);
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
