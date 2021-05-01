'use strict'

const express = require('express');
const userModel = require('./models/User.js');
const base64 = require('base-64');
const basic = require('./middleware/basic.js');
const inquirer = require('inquirer');

var readlineSync = require('readline-sync');

let username, password;

module.exports = () => {

  console.log("Welcome to Chatter");

  var loginPrompt = {
    type: 'list',
    name: 'account',
    message: 'Do you have an account?',
    choices: ['Yes', 'No'],
  }

  inquirer.prompt(loginPrompt)
    .then(answer => {
      if (answer.account === 'Yes') {
        login();
      } else {
        console.log("Let's create a new account");
        newUser();
      }
    })
    .catch(err => {
      if(err.isTtyError) {
        //
      } else {
        console.log(err);
      }
    })

}

function login() {
  var questions = [
    { type: 'input',
      name: 'username',
      message: 'Enter your username: ',
    },
    {
      type: 'input',
      name: 'password',
      message: 'Enter your password: ',
    }
  ]
  inquirer.prompt(questions)
    .then(answer => {
      basic(answer.username, answer.password);
    })
    .catch(err => {
      if(err.isTtyError) {
        //
      } else {
        console.log(err);
      }
    })

}

function newUser() {
  var questions = [
    { type: 'input', name: 'username', message: 'Create a username: ' },
    { type: 'input', name: 'password', message: 'Create a password: ' }
  ]
  inquirer.prompt(questions)
    .then(answer => {
      var user = new userModel({ username: answer.username, password: answer.password });
      user.save((err, user) => {
        if (err) {
          console.log(err.message || "Error creating new user");
        } else {
          console.log(`You have successfully created an account ${answer.username}!`);
        }
      })
    })
    .catch(err => {
      if(err.isTtyError) {}
      else { console.log(err); }
    })
}
