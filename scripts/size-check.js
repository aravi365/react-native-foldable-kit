// Fails when the published JavaScript (lib/*.js, web build included) grows past the badge's limit.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LIMIT = 7 * 1024;
const dir = path.join(__dirname, '..', 'lib');
const code = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(dir, f))).join('\n');
const size = zlib.gzipSync(code, { level: 9 }).length;

console.log(`lib/*.js: ${(size / 1024).toFixed(2)} KB gzipped (limit ${LIMIT / 1024} KB)`);
if (size > LIMIT) process.exit(1);
