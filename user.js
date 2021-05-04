'use strict';

//3rd part dependencies
const dotenv = require('dotenv');
const io = require('socket.io-client');
const repl = require('repl');
const chalk = require('chalk');
const inquirer = require('inquirer');

//configure environmental variables
dotenv.config();
const port = process.env.PORT;

//create reference to host url
const host = `https://5f237673f2b6.ngrok.io`;

//give socket the host URL
const socket = io.connect(`${host}/chatter`);

//create a username and color for your text

let username = 'Guest';
//so we can make this modular later
const textColor = chalk.bold.blue;


socket.on('connect', () => {
  console.log(`Client connected to Host Url:${host}.`);

  var loginPrompt = { type: 'list', name: 'account', message: 'Do you have an account?', choices: ['Yes', 'No'] }

  inquirer.prompt(loginPrompt)
    .then(answer => {
      var questions = [
        { type: 'input', name: 'username', message: 'Enter your username: ' },
        { type: 'input', name: 'password', message: 'Enter your password: ' }
      ]
      if (answer.account === 'Yes') {
        inquirer.prompt(questions)
          .then(answers => {
            socket.emit('login-credentials', { username: answers.username, password: answers.password });
          })
          .catch(err => { console.log(err) })
      } else {
        inquirer.prompt(questions)
          .then(answers => {
            socket.emit('signup-credentials', { username: answers.username, password: answers.password });
          })
      }
    })
    .catch(err => { console.log(err) });
})

socket.on('joined-server', payload => {
  //should reassign username to user input
  username = payload;
  console.log(`♫${payload}♫ has entered the Chatter©!`);
  replStart();
  socket.off('joined-server');
});

socket.on('odd-number-of-users', payload => {
  console.log(payload)
});

socket.on('clear', payload => {
  process.stdout.write('\x1B[2J');
})

socket.on('authors', payload => {
  console.log('Chatter© Development Team: ');
  Object.keys(payload).forEach(value => {
    console.log(`${payload[value].name}Linked-in url: ${payload[value].linkedin}`);
  });
})

socket.on('message', (payload) => {
  const text = payload.text;
  const usernameReceived = payload.username;
  if (usernameReceived === username) {
    console.log(chalk.blue(`[${usernameReceived}] ${text.split('\n')[0]}`));
  } else {
    console.log(chalk.green(`[${usernameReceived}] ${text.split('\n')[0]}`));
  }
})

socket.on('command', (payload) => {
  const text = payload.text;
  const usernameReceived = payload.username;
  process.stdout.write('\u001b[1F');
  if (usernameReceived === username) {
    console.log(chalk.blue(`[${usernameReceived}] ${text.split('\n')[0]}`));
  } else {
    console.log(chalk.green(`[${usernameReceived}] ${text.split('\n')[0]}`));
  }
})

socket.on('question', (payload) => {
  console.log(payload.question, '\n', payload.choices);
})

socket.on('nextQuestion', (payload) => {
  console.log(payload.question, '\n', payload.choices);
})

socket.on('correct', (payload) => {
  console.log(chalk.green(payload));
})

socket.on('incorrect', (payload) => {
  console.log(chalk.red(payload));
})

//eventual events we'll probably need
// socket.on('round', payload => {
//   console.log(`${payload.username} WON THE ROUND!!!`)
// })

// socket.on('winner', payload => {
//   console.log(`${payload.username} WINS!!`)
// })


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