const { createWorker } = require('tesseract.js');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * Extract text from an image using Tesseract.js OCR with Sharp preprocessing
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Extracted text
 */
async function extractText(imagePath) {
    let worker = null;
    const processedPath = path.join(path.dirname(imagePath), 'proc-' + path.basename(imagePath));

    try {
        console.log(`[OCR] 🛠️  Preprocessing: ${path.basename(imagePath)}`);

        // 1. Image Preprocessing with Sharp
        // - Resize bitonal/grayscale to 300 DPI equivalent (~2-3x)
        // - Grayscale
        // - Normalize (contrast enhancement)
        // - Threshold (binary black/white)
        // - Sharpen
        await sharp(imagePath)
            .resize({ width: 2500, withoutEnlargement: true }) // Upscale for better OCR
            .grayscale()
            .normalize()
            .threshold(180) // Convert to strictly B&W
            .sharpen()
            .toFile(processedPath);

        console.log(`[OCR] 🏁 Starting extraction from processed image: ${path.basename(processedPath)}`);

        worker = await createWorker('eng', 1, {
            logger: m => {
                if (m.status === 'recognizing text') {
                    // console.log(`[OCR] 💡 Progress: ${(m.progress * 100).toFixed(1)}%`);
                }
            }
        });

        // Use more accurate PSM (3 = Auto page segmentation with OSD)
        await worker.setParameters({
            tessedit_pageseg_mode: '3',
            tessjs_create_hocr: '0',
            tessjs_create_tsv: '0',
        });

        const { data: { text } } = await worker.recognize(processedPath);

        console.log(`[OCR] ✅ Extraction complete. Length: ${text.length}`);

        // Cleanup temp file
        await fs.unlink(processedPath).catch(() => { });

        return text.trim();
    } catch (error) {
        console.error('[OCR ❌ ERROR]:', error);
        // Try to cleanup if exists
        await fs.unlink(processedPath).catch(() => { });
        throw error;
    } finally {
        if (worker) {
            await worker.terminate();
        }
    }
}

module.exports = { extractText };
