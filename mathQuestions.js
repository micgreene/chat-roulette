// The correct answer is the first choice (keeping it simple).
// Choices will be presented in random order.
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
  question: "What is the smallest number into which 8, 18, and 28 all divide?",
  choices: [
      '504',
      '252',
      '28',
      '2'
  ],
  answer: '504'
},
{
  question: "What is the probability of rolling a pair of dice and getting the same number?",
  choices: [
      '1/6',
      '1/12',
      '1/4',
      '1/18'
  ],
  answer: '1/6'
},
{
  question: "What's the area of a circle with radius 5?",
  choices: [
      '79',
      '25',
      '16',
      '31'
  ],
  answer: '79'
},
{
  question: "What is 15% of 420?",
  choices: [
      '63',
      '57',
      '61',
      '69'
  ],
  answer: '63'
},
{
  question: "How much is a googol? Note 10^3 means 10 x 10 x 10",
  choices: [
      '10^100',
      '10^10',
      '10^15',
      '10^20'
  ],
  answer: '10^100'
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
