const { createWorker } = require('tesseract.js');
const path = require('path');
const fs = require('fs');

async function testFullOCR() {
    console.log('--- Full OCR Test Start ---');
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.PNG') || f.endsWith('.JPG') || f.endsWith('.png') || f.endsWith('.jpg'));

    if (files.length === 0) {
        console.error('No files found in uploads directory to test!');
        return;
    }

    const testFile = path.join(uploadsDir, files[0]);
    console.log(`Testing with file: ${testFile}`);

    let worker = null;
    try {
        worker = await createWorker('eng', 1, {
            logger: m => console.log(m)
        });
        console.log('Worker created');

        const { data: { text } } = await worker.recognize(testFile);
        console.log(`Extracted text length: ${text.length}`);
        console.log('Extracted text preview:', text.substring(0, 100));

        await worker.terminate();
        console.log('--- Full OCR Test Passed ---');
    } catch (err) {
        console.error('--- Full OCR Test Failed ---');
        console.error(err);
    }
}

testFullOCR();
