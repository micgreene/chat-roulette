'use strict';

class User{
  constructor(username){
    this.id = null,
    this.username = username,
    this.room = null,
    this.transcript = null,
    this.answer = null,
    this.score = 0,
    this.wins = 0,
    this.losses = 0
    //,this.ties = 0
  };
}

module.exports = User;
