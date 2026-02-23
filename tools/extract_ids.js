const fs = require('fs');

// Read the encoded file
const content = fs.readFileSync('sample_data/user_map_encoded.txt', 'utf8');

// The file content is likely the full Data URI: "data:image/svg+xml;utf8,<svg ...>"
// We need to extract the SVG part.
// Split by "utf8," to get the encoded SVG.
const parts = content.split('utf8,');
if (parts.length < 2) {
    console.error('Could not find "utf8," in the file content.');
    process.exit(1);
}

const encodedSvg = parts[1];
const svg = decodeURIComponent(encodedSvg);

// Find all id="..." attributes
// This regex covers id="value" and id='value'
const idRegex = /id=['"]([^'"]+)['"]/g;
const ids = [];
let match;

while ((match = idRegex.exec(svg)) !== null) {
    // attributes like id="Layer_1" are common auto-generated IDs, but included anyway
    ids.push(match[1]);
}

// Generate CSV content
console.log('Category,Measure');
ids.forEach(id => {
    // Generate a random measure value between 10 and 100
    const val = Math.floor(Math.random() * 90) + 10;
    console.log(`${id},${val}`);
});
