/**
 * AI Utility Functions for Question Analysis
 * Uses heuristic/keyword-based approaches
 */

// Common topic keywords for tagging
const topicKeywords = {
    'Mathematics': ['equation', 'solve', 'calculate', 'sum', 'product', 'integral', 'derivative', 'algebra', 'geometry', 'trigonometry', 'matrix', 'probability', 'statistics', 'number', 'formula', 'graph', 'function', 'variable', 'theorem', 'proof'],
    'Physics': ['force', 'energy', 'velocity', 'acceleration', 'momentum', 'gravity', 'wave', 'frequency', 'circuit', 'resistance', 'current', 'voltage', 'magnetic', 'electric', 'newton', 'mass', 'weight', 'pressure', 'temperature', 'heat'],
    'Chemistry': ['element', 'compound', 'reaction', 'acid', 'base', 'molecule', 'atom', 'electron', 'proton', 'neutron', 'bond', 'ion', 'solution', 'concentration', 'oxidation', 'reduction', 'periodic', 'organic', 'inorganic', 'molar'],
    'Biology': ['cell', 'gene', 'dna', 'rna', 'protein', 'enzyme', 'organism', 'species', 'evolution', 'ecosystem', 'photosynthesis', 'respiration', 'mitosis', 'meiosis', 'chromosome', 'nucleus', 'membrane', 'tissue', 'organ'],
    'Computer Science': ['algorithm', 'program', 'code', 'function', 'variable', 'loop', 'array', 'string', 'database', 'network', 'protocol', 'binary', 'compiler', 'memory', 'cpu', 'stack', 'queue', 'tree', 'sorting', 'search'],
    'English': ['grammar', 'sentence', 'verb', 'noun', 'adjective', 'adverb', 'pronoun', 'tense', 'clause', 'phrase', 'synonym', 'antonym', 'vocabulary', 'comprehension', 'essay', 'paragraph', 'punctuation'],
    'General Knowledge': ['country', 'capital', 'president', 'war', 'history', 'geography', 'river', 'mountain', 'ocean', 'continent', 'population', 'currency', 'language', 'festival', 'culture', 'sports', 'olympics']
};

/**
 * Tag a question with relevant topics based on its text
 * @param {string} text - Question text
 * @returns {string[]} - Array of matched topic tags
 */
function tagQuestion(text) {
    if (!text) return ['General'];
    const lowerText = text.toLowerCase();
    const tags = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
        const matchCount = keywords.filter(kw => lowerText.includes(kw)).length;
        if (matchCount >= 2) {
            tags.push(topic);
        }
    }

    return tags.length > 0 ? tags : ['General'];
}

/**
 * Detect question difficulty based on text analysis
 * @param {string} text - Question text
 * @returns {string} - 'easy', 'medium', or 'hard'
 */
function detectDifficulty(text) {
    if (!text) return 'medium';
    const lowerText = text.toLowerCase();

    // Hard indicators
    const hardIndicators = ['prove', 'derive', 'analyze', 'evaluate', 'demonstrate', 'explain why', 'complex', 'advanced', 'critical', 'justify', 'differentiate between', 'compare and contrast', 'discuss in detail'];
    const hardScore = hardIndicators.filter(ind => lowerText.includes(ind)).length;

    // Easy indicators
    const easyIndicators = ['what is', 'name the', 'define', 'list', 'identify', 'which of the following', 'true or false', 'fill in the blank', 'select', 'choose'];
    const easyScore = easyIndicators.filter(ind => lowerText.includes(ind)).length;

    // Word count factor
    const wordCount = text.split(/\s+/).length;

    if (hardScore >= 2 || wordCount > 80) return 'hard';
    if (easyScore >= 2 || wordCount < 15) return 'easy';
    return 'medium';
}

/**
 * Suggest a likely correct answer from OCR-extracted options
 * @param {string} questionText - The question text
 * @param {string[]} options - Array of option texts
 * @returns {number} - Index of the suggested correct answer (-1 if unsure)
 */
function suggestAnswer(questionText, options) {
    if (!questionText || !options || options.length === 0) return -1;

    // 1. Check for explicit markers in the WHOLE block (Question + Options)
    const fullText = questionText + "\n" + options.join("\n");

    // Look for patterns like "Correct: A", "Ans: B", "Answer: 3", "Solution: (D)"
    const ansMatch = fullText.match(/(?:Ans|Answer|Correct|Solution)[:\s\-\.]*\(?([a-eA-E]|\d+)\)?/i);
    if (ansMatch) {
        const val = ansMatch[1].toUpperCase();
        // If it's a letter A-E
        if (/[A-E]/.test(val)) {
            const index = val.charCodeAt(0) - 65;
            if (index < options.length) return index;
        }
        // If it's a number 1-5
        const num = parseInt(val);
        if (!isNaN(num) && num > 0 && num <= options.length) {
            return num - 1;
        }
    }

    // 2. Check for visual markers in individual options (e.g. "* (A) text", "(A) text (Correct)")
    const visualMarkers = [/^[*✓✅]/, /correct/i, /ans/i];
    for (let i = 0; i < options.length; i++) {
        if (visualMarkers.some(regex => regex.test(options[i]))) {
            return i;
        }
    }

    // 3. Fallback to heuristic: the longest, most detailed option
    let maxScore = -1;
    let suggestedIndex = -1;

    options.forEach((opt, index) => {
        if (!opt) return;
        let score = 0;
        score += opt.length / 10;
        const qWords = questionText.toLowerCase().split(/\s+/);
        const oWords = opt.toLowerCase().split(/\s+/);
        const overlap = oWords.filter(w => qWords.includes(w) && w.length > 3).length;
        score += overlap * 2;
        const specificWords = ['specifically', 'exactly', 'precisely', 'always', 'both', 'all of the above', 'none of the above'];
        specificWords.forEach(sw => {
            if (opt.toLowerCase().includes(sw)) score += 1;
        });

        if (score > maxScore) {
            maxScore = score;
            suggestedIndex = index;
        }
    });

    return suggestedIndex;
}

/**
 * Detects and splits multiple questions from a single text block
 */
/**
 * Detects and splits multiple questions from a single text block
 */
function splitQuestions(text) {
    if (!text) return [];

    // Normalize line endings and clean up
    const cleanedText = text.replace(/\r\n/g, '\n').trim();

    // Split by common question patterns: 
    // "1. ", "Q1. ", "Question 1:", "1)", "[1]"
    // Strictly looking for start of line numbers or Q markers to avoid clashing with options
    const questionRegex = /(?:^|\n)\s*(?:\d+[\.\)]|Q(?:uestion)?\s*\d+[\.:\)]|\[\d+\])\s+/gi;

    const parts = cleanedText.split(questionRegex);
    const markers = cleanedText.match(questionRegex) || [];

    const results = [];

    // If no markers found, treat the whole thing as one question
    if (markers.length === 0) {
        if (cleanedText.length > 5) {
            results.push(parseOptions(cleanedText));
        }
        return results;
    }

    // Iterate through parts
    for (let i = 0; i < markers.length; i++) {
        const content = (parts[i + 1] || '').trim();
        if (content.length > 3) { // Lenient for short questions
            results.push(parseOptions(content));
        }
    }

    // Special case: if parts[0] is substantial, it might be the first question without a marker
    if (parts[0].trim().length > 20) {
        results.unshift(parseOptions(parts[0].trim()));
    }

    return results;
}

/**
 * Parses a single question block to extract options and look for correct answer markers
 */
function parseOptions(block) {
    // Look for option markers: (a), (b), a), A., 1), etc.
    // Supports letters A-E and numbers 1-5 as long as they aren't question headers
    const optionRegex = /(?:\n|^)\s*(?:\(?([a-eA-E]|[1-5])\)[\s\.]|([a-eA-E]|[1-5])[.\s\)\-\u2022\u00b7]+|(?<=\s|^)([A-E])(?=[a-z\s]|$))/gi;

    // We want to find all occurrences of options
    const optionMatches = [...block.matchAll(optionRegex)];

    if (optionMatches.length === 0) {
        return { question_text: block.trim(), options: [] };
    }

    // Question text is everything before the first option
    const firstOptionIndex = optionMatches[0].index;
    const questionText = block.substring(0, firstOptionIndex).trim();

    const options = [];
    for (let i = 0; i < optionMatches.length; i++) {
        const start = optionMatches[i].index;
        const end = optionMatches[i + 1] ? optionMatches[i + 1].index : block.length;
        const optBlock = block.substring(start, end).trim();

        // Remove the marker from the start of optBlock 
        const cleanedOpt = optBlock.replace(/^(?:\(?([a-eA-E]|\d+)\)[\s\.]|([a-eA-E]|\d+)[.\s\)\-\u2022\u00b7]+|([A-E])(?=[a-z\s]|$))/i, '').trim();
        if (cleanedOpt) options.push(cleanedOpt);
    }

    return {
        question_text: questionText,
        options: options.slice(0, 5)
    };
}

/**
 * Parses an answer key string into a map of { questionNumber: optionIndex }
 * Supports formats: "1-A", "1. B", "1) C", "1:D", "2 B"
 */
function parseAnswerKey(text) {
    if (!text) return {};
    const keyMap = {};

    // Pattern to look for a number followed by a separator and then A-E or 1-5
    // Examples matched: "1-A", "2. B", "3) C", "4: D", "5 E", "1 A"
    const pairRegex = /(?:^|\s|[,;])(\d+)\s*[.\-\)\:]?\s*([a-eA-E]|[1-5])(?:\s|[,;]|$)/g;

    let match;
    while ((match = pairRegex.exec(text)) !== null) {
        const qNum = parseInt(match[1]);
        const ansVal = match[2].toUpperCase();

        let ansIndex = -1;
        if (/[A-E]/.test(ansVal)) {
            ansIndex = ansVal.charCodeAt(0) - 65;
        } else {
            ansIndex = parseInt(ansVal) - 1;
        }

        if (ansIndex >= 0) {
            keyMap[qNum] = ansIndex;
        }
    }

    return keyMap;
}

module.exports = { tagQuestion, detectDifficulty, suggestAnswer, splitQuestions, parseAnswerKey };
