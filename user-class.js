'use strict';

class User{
  constructor(username){
    this.username = username,
    this.transcript = null,
    this.score = 0,
    this.wins = 0,
    this.losses = 0
    //,this.ties = 0
  };
}

module.exports = User;
