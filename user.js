'use strict';

//3rd part dependencies
const dotenv = require('dotenv');
const io = require('socket.io-client');
const repl = require('repl');
const chalk = require('chalk');
const { prototype } = require('stream');
const inquirer = require('inquirer');

//configure environmental variables
dotenv.config();
const port = process.env.PORT;

//create reference to host url
const host = `http://localhost:${port}`;

//give socket the host URL
const socket = io.connect(`${host}/chatter`);

//create a username and color for your text
let username = 'Guest';
const textColor = chalk.bold.purple;

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
  console.log(`♫${payload}♫ has entered the Chatter©!`)
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
  const username = payload.username;
  console.log(chalk.green(`[${username}] ${text.split('\n')[0]}`))
})

//eventual events we'll probably need
// socket.on('round', payload => {
//   console.log(`${payload.username} WON THE ROUND!!!`)
// })

// socket.on('winner', payload => {
//   console.log(`${payload.username} WINS!!`)
// })


//this evaluates all text enter into the terminal after the user hits enter
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
