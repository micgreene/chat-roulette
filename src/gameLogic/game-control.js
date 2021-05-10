'use strict'

function countdown(room, io) {

  let text = { text: '3\n', username: 'SYSTEM', textStyle: 'green', textColor: 'bold' };
  let time = 3;

  const startClock = () => {
    var interval = setInterval( () => {
        // perform the inside code once every second
          text.text = `${time}\n`
          time --;
          io.to(room).emit('message', text);
      }, 1*1000);
      setTimeout(() => {
        clearInterval(interval)
      }, 4000);
  }

  startClock();

}

module.exports = {
  countdown: countdown,
}
