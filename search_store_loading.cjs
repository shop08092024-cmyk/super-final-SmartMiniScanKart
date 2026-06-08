const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        searchDir(fullPath);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('loading') && content.includes('useStore')) {
          console.log('Match found in:', fullPath);
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('loading') && line.includes('useStore')) {
              console.log(`  Line ${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

searchDir('d:\\COLLEGE\\smartminscankart\\4\\SmartMiniScanKart_fixed_v2\\SmartMiniScanKart_fixed\\src');
console.log('Search completed.');
