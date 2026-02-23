const fs = require('fs');

try {
    let content = fs.readFileSync('sample_data/user_map_encoded.txt', 'utf8');

    // Attempt to isolate the payload
    if (content.includes('utf8,')) {
        content = content.split('utf8,')[1];
    } else if (content.includes('base64,')) {
        // Just in case, though user said utf8
        const bg = Buffer.from(content.split('base64,')[1], 'base64');
        content = bg.toString('utf8');
    }

    let decoded = content;
    try {
        decoded = decodeURIComponent(content);
    } catch (e) {
        console.log('Standard decode failed (expected due to truncation), using fallback.');
        // Fallback: manual partial decode for regex purposes
        decoded = content.replace(/%3C/g, '<')
            .replace(/%3E/g, '>')
            .replace(/%3D/g, '=')
            .replace(/%22/g, '"')
            .replace(/%20/g, ' ')
            .replace(/%2F/g, '/')
            .replace(/%3A/g, ':');
    }

    console.log('--- DECODED PREVIEW ---');
    console.log(decoded.substring(0, 500));

    const idSet = new Set();
    const ids = [];

    // Regex for id="val" or id='val'
    const idRegex = /id=['"]([^'"]+)['"]/gi;
    let match;
    while ((match = idRegex.exec(decoded)) !== null) {
        if (!idSet.has(match[1])) {
            idSet.add(match[1]);
            ids.push(match[1]);
        }
    }

    // Also look for Title tags which are often used as categories in Synoptic Panel
    // <title>The Brain</title>
    const titleRegex = /<title>([^<]+)<\/title>/gi;
    while ((match = titleRegex.exec(decoded)) !== null) {
        if (!idSet.has(match[1])) {
            idSet.add(match[1]);
            ids.push(match[1]);
        }
    }

    console.log('--- FOUND IDs ---');
    if (ids.length > 0) {
        console.log('Category,Measure');
        ids.forEach(id => {
            // Skip structural IDs if possible
            if (id === 'Map' || id.startsWith('svg_')) return;
            console.log(`${id},${Math.floor(Math.random() * 100)}`);
        });
    } else {
        console.log('No IDs found.');
    }

} catch (err) {
    console.error(err);
}
