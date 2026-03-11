const { splitQuestions } = require('./utils/ai');

const testText = `
1. What is the capital of France?
A. Paris
B. London
C. Berlin
D. Madrid
2. Which planet is known as the Red Planet?
A. Earth
B. Mars
C. Jupiter
D. Saturn
`;

console.log('--- Testing Split (Letters) ---');
const results = splitQuestions(testText);
results.forEach((r, i) => {
    console.log(`Question ${i + 1}:`, r.question_text);
    console.log(`Options:`, r.options);
    console.log('---');
});

const testText2 = `
Q3. What is the value of pi (approx)?
(1) 3.14
(2) 2.71
(3) 1.41
(4) 1.61
`;

console.log('--- Testing Numeric Options ---');
const results2 = splitQuestions(testText2);
results2.forEach((r, i) => {
    console.log(`Question ${i + 1}:`, r.question_text);
    console.log(`Options:`, r.options);
    console.log('---');
});
