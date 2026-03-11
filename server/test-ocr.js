const { createWorker } = require('tesseract.js');
const path = require('path');

async function testOCR() {
    console.log('--- OCR Test Start ---');
    try {
        const worker = await createWorker('eng');
        console.log('Worker created successfully');

        // Use a small dummy image if available, or just test worker creation
        console.log('Testing worker termination...');
        await worker.terminate();
        console.log('Worker terminated successfully');
        console.log('--- OCR Test Passed ---');
    } catch (err) {
        console.error('--- OCR Test Failed ---');
        console.error(err);
    }
}

testOCR();
