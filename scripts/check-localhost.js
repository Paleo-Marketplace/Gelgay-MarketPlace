const fs = require('fs');
const path = require('path');

const DIRS_TO_CHECK = [
  path.join(__dirname, '../services/api-gateway'),
  path.join(__dirname, '../apps/buyer-storefront/app'),
  path.join(__dirname, '../apps/vendor-dashboard/src'),
  path.join(__dirname, '../apps/admin-console/src'),
  path.join(__dirname, '../apps/courier-web-view/src')
].filter(fs.existsSync);

const ALLOWED_PATTERNS = [
  'node_modules',
  '.next',
  'dist',
  'tests',
  'seed.js'
];

let hasErrors = false;

function scanDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const isAllowed = ALLOWED_PATTERNS.some(pattern => fullPath.includes(pattern));
      if (isAllowed) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
        if (trimmed.startsWith('console.')) return;
        if ((trimmed.includes('process.env.') || trimmed.includes('import.meta.env.')) && (trimmed.includes('||') || trimmed.includes('??'))) return;
        if (trimmed.includes('frontendUrl') || trimmed.includes('${frontendUrl}')) return;

        if (line.includes('http://localhost') || line.includes('http://127.0.0.1')) {
          console.error(`❌ HARDCODED LOCALHOST FOUND: ${fullPath}:${index + 1}`);
          console.error(`   Line: ${trimmed}`);
          hasErrors = true;
        }
      });
    }
  }
}

console.log('🔍 Auditing source files for hardcoded localhost URLs...');
DIRS_TO_CHECK.forEach(dir => scanDirectory(dir));

if (hasErrors) {
  console.error('\n💥 Build Check Failed: Hardcoded localhost URLs must be removed or moved to environment config.');
  process.exit(1);
} else {
  console.log('✅ Audit Passed: No illegal hardcoded localhost URLs found in production source files.');
}
