'use strict';
const superagent = require('superagent');

async function getQuestions() {
  const url = 'https://opentdb.com/api.php?amount=50'
  let questionsArr = [];

  await superagent.get(url)
    .then ( resultData => {
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
        // console.log(questionsArr);
        // return questionsArr;
      })
    })
    return questionsArr;
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

module.exports = {
  cleanString: cleanString,
  // getQuestions: getQuestions,
}
