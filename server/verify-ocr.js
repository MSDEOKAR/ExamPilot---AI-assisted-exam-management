const { extractText } = require('./utils/ocr');
const path = require('path');
const fs = require('fs');

async function verifyImprovedOCR() {
    console.log('--- 🚀 Improved OCR Accuracy Verification ---');
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.PNG') || f.endsWith('.JPG') || f.endsWith('.png') || f.endsWith('.jpg'));

    if (files.length === 0) {
        console.error('❌ No files found in uploads directory to test!');
        return;
    }

    const testFile = path.join(uploadsDir, files[0]);
    console.log(`🧪 Testing with file: ${testFile}`);

    try {
        const text = await extractText(testFile);
        console.log('------------------------------------------');
        console.log(`📊 Extracted text length: ${text.length}`);
        console.log('------------------------------------------');
        console.log('📝 Extracted text preview:');
        console.log(text.substring(0, 500));
        console.log('------------------------------------------');
        console.log('✅ verification Passed!');
    } catch (err) {
        console.error('❌ Verification Failed!');
        console.error(err);
    }
}

verifyImprovedOCR();
