'use strict';

//3rd part dependencies
const dotenv = require('dotenv');
const io = require('socket.io-client');
const repl = require('repl');
const chalk = require('chalk');
const inquirer = require('inquirer');
const mute = require('mute');

//temporarily mutes/unmutes process.std.out by using unmute()
const unmute = mute();
unmute();//unmutes



//configure environmental variables
dotenv.config();
const port = process.env.PORT;

const host = `http://localhost:${port}`;
// const host = 'https://5f237673f2b6.ngrok.io';

//give socket the host URL
const socket = io.connect(`${host}/chatter`);

// username is overwritten in config event
// config event also sets the users color/style pref for display
let username = 'Guest';
var textColor = chalk.bold.blue;

socket.on('disconnect', () => {
  socket.off('message');
});

socket.on('connect', () => {
  console.log(`Client connected to Host Url:${host}.`);
  login();
})

socket.on('config', payload => {
  username = payload;
  const userConfigs = [
    { type: 'list', name: 'textColor', message: 'Select your text color: ', choices: ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray'] },
    { type: 'list', name: 'textStyle', message: 'Select your text style: ', choices: ['bold', 'dim', 'italic', 'underline', 'inverse'] }
  ]
  inquirer.prompt(userConfigs)
  .then(answer => {
    socket.emit('configs-complete', { username: username, textStyle: answer.textStyle, textColor: answer.textColor });
  })
  .catch(err => { console.log(err) });
})

socket.on('login-error', payload => {
  console.log(`There was an error processing your login.\n${payload}`);

  inquirer.prompt([
    { type: 'list', name: 'retry', message: 'Would you like to try again?', choices: ['Yes', 'No'] }
  ])
  .then(answer => {
    if (answer.retry === 'Yes') {
      login();
    } else {
      console.log("Goodbye!");
      socket.disconnect();
    }
  })
  .catch((err) => {
    console.log(err);
  })
})

socket.on('joined-server', payload => {
  username = payload;
  console.log(`\n♫${payload}♫ has entered the Chatter©!\n`);
  console.log(`Joined Room: Lobby\n`);
  replStart();
  socket.off('joined-server');
});

socket.on('odd-number-of-users', payload => {
  console.log(payload)
});

socket.on('clear-terminal', payload => {
  process.stdout.write('\x1B[2J');
})

socket.on('authors', payload => {
  clearCommand();
  console.log('Chatter© Development Team: ');
  Object.keys(payload).forEach(value => {
    console.log(`${payload[value].name}Linked-in url: ${payload[value].linkedin}`);
  });
})

socket.on('command', (payload) => {
  const text = payload.text;
  const usernameReceived = payload.username;
  clearCommand();
  if (usernameReceived === username) {
    console.log(chalk.blue(`[${usernameReceived}] ${text.split('\n')[0]}`));
  } else {
    console.log(chalk.green(`[${usernameReceived}] ${text.split('\n')[0]}`));
  }
})

socket.on('question', (payload) => {
  console.log(payload.question, '\n', payload.all_answers);
})

socket.on('nextQuestion', (payload) => {
  console.log(payload.question, '\n', payload.all_answers);
})

socket.on('correct', (payload) => {
  console.log(chalk.green(payload, '\n\n'));
})

function clearCommand() {
  process.stdout.write('\u001b[1F');
}


function replStart() {
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

}

function login() {
  var loginPrompt = { type: 'list', name: 'account', message: 'Do you have an account?', choices: ['Yes', 'No'] }
  inquirer.prompt(loginPrompt)
    .then(answer => {
      let nextEvent = (answer.account === "Yes") ? 'login-credentials' : 'signup-credentials';
      let loginQs = [{ type: 'input', name: 'username', message: 'Enter your username: ' },
        { type: 'password', name: 'secret', message: 'Enter your password: ', mask: '*' }]
      let signupQs = [{ type: 'input', name: 'username', message: 'Enter your username: ' },
        { type: 'password', name: 'secret', message: 'Enter your password. Must have at least 8 characters, a letter, number, and a symbol: ', mask: '*', validate: validatePassword}]
      let questions = (answer.account === "Yes") ? loginQs : signupQs;
      // socket.off('messages');
      inquirer.prompt(questions)
        .then(answers => {
          socket.emit(nextEvent, { username: answers.username, password: answers.secret });
          messagesOn();
        })
        .catch(err => { console.log(err) })
      })
    .catch(err => { console.log(err) });
}

function messagesOn() {
  socket.on('message', (payload) => {
    console.log(chalk[payload.textStyle][payload.textColor](`[${payload.username}] ${payload.text.split('\n')[0]}\n`))
  });
}

function messagesOff() {
  socket.off('messages');
}

function validatePassword(value) {

  let errorMessage = '';

  const eightCharacters = /.{8,}/;
  const letter = /[A-Za-z]+/;
  const number = /\d+/;
  const symbol = /\W+/;

  if (!eightCharacters.test(value)) {errorMessage += 'not enough characters; '}
  if (!letter.test(value)) {errorMessage += 'password must have at least one letter; '}
  if (!number.test(value)) {errorMessage += 'password must have at least one number; '}
  if (!symbol.test(value)) {errorMessage += 'password must have at least one symbol'}

  if (!errorMessage.length) { return true; }

  return errorMessage;
}
