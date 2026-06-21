const fs = require('fs');
try {
    const src = fs.readFileSync('scoreboard.js', 'utf8');
    const matches = src.match(/https?:\/\/[^\s\"\'\`\)]+/g);
    console.log([...new Set(matches)]);
} catch(e) {
    console.log(e.message);
}
