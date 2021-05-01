let mathQuestions = [
  {
  question: "Which number is NOT a prime number?",
  choices: [
      '141',
      '37',
      '613',
      '23'
  ],
  answer: '141'
},
{
  question: "What is the least prime natural number?",
  choices: [
      '2',
      '1',
      '3',
      '0'
  ],
  answer: '2'
}];

if (typeof module == 'object') {
  module.exports = mathQuestions;    
}