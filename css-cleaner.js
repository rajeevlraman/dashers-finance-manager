const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'css', 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Remove specific duplicate blocks
const patternsToRemove = [
    // Remove duplicate .btn-action blocks (keep first)
    /\.btn-action \{[\s\S]*?\.btn-action\.delete \{[\s\S]*?\.btn-action:hover \{[\s\S]*?\}\s*\}(?=.*?\.btn-action \{)/g,
    
    // Remove duplicate stats-grid (second occurrence)
    /\.stats-grid \{[\s\S]*?\.stat-subtext \{[\s\S]*?\}\s*\}(?=.*?\.stats-grid \{)/g,
    
    // Remove duplicate .stat-content (keep first)
    /\.stat-content \{[\s\S]*?\}(?=.*?\.stat-content \{)/g,
];

patternsToRemove.forEach(pattern => {
    css = css.replace(pattern, '');
});

// Remove exact duplicate lines
const lines = css.split('\n');
const seen = new Set();
const cleanedLines = [];

lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('/*')) {
        cleanedLines.push(line);
        return;
    }
    
    const key = trimmed.replace(/[\s]/g, '').toLowerCase();
    if (!seen.has(key)) {
        seen.add(key);
        cleanedLines.push(line);
    }
});

const cleanedCSS = cleanedLines.join('\n');

// Save cleaned version
const cleanedPath = path.join(__dirname, 'css', 'styles-cleaned.css');
fs.writeFileSync(cleanedPath, cleanedCSS);

console.log('✅ CSS cleaned!');
console.log(`Original: ${css.length} chars`);
console.log(`Cleaned: ${cleanedCSS.length} chars`);
console.log(`Saved: ${css.length - cleanedCSS.length} chars`);