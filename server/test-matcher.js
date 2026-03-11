const { splitQuestions, parseAnswerKey } = require('./utils/ai');

const questionsText = `
1. What is the color of the sky?
A. Red
B. Green
C. Blue
D. Yellow

2. Which is a fruit?
A. Spinach
B. Apple
C. Carrot
D. Potato
`;

const answerKeyText = "1-C, 2. B";

console.log('--- Testing Dual-Input Matcher ---');
const questions = splitQuestions(questionsText);
const keyMap = parseAnswerKey(answerKeyText);

console.log('Parsed Key Map:', keyMap);

questions.forEach((q, i) => {
    const qNum = i + 1;
    const ansIndex = keyMap[qNum];
    console.log(`Q${qNum}: ${q.question_text}`);
    console.log(`Matched Answer Index: ${ansIndex} (${q.options[ansIndex]})`);
    console.log('---');
});
