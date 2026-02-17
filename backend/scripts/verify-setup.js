#!/usr/bin/env node

/**
 * PlotPulse Backend Setup Verification
 * Run this to verify your environment is properly configured
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, '..');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function check(label, condition, errorMsg = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${label}`);
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${label}`);
    if (errorMsg) console.log(`  ${colors.yellow}→${colors.reset} ${errorMsg}`);
    return false;
  }
}

console.log(`\n${colors.blue}PlotPulse Backend Setup Verification${colors.reset}\n`);
console.log('='.repeat(50) + '\n');

let allPassed = true;

// Check Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
allPassed &= check(
  `Node.js version ${nodeVersion}`,
  majorVersion >= 18,
  'Node.js 18+ required'
);

// Check .env file
const envPath = join(backendDir, '.env');
const hasEnv = existsSync(envPath);
allPassed &= check(
  '.env file exists',
  hasEnv,
  'Copy .env.example to .env and configure'
);

if (hasEnv) {
  const envContent = readFileSync(envPath, 'utf-8');
  
  allPassed &= check(
    'ENCRYPTION_KEY is set',
    envContent.includes('ENCRYPTION_KEY=') && !envContent.includes('your-32-byte-hex-key-here'),
    'Generate with: openssl rand -hex 32'
  );
  
  allPassed &= check(
    'PORT is configured',
    envContent.includes('PORT=')
  );
}

// Check package.json
const packagePath = join(backendDir, 'package.json');
allPassed &= check(
  'package.json exists',
  existsSync(packagePath)
);

// Check node_modules
const nodeModulesPath = join(backendDir, 'node_modules');
const hasNodeModules = existsSync(nodeModulesPath);
allPassed &= check(
  'Dependencies installed',
  hasNodeModules,
  'Run: npm install'
);

// Check required source files
const requiredFiles = [
  'src/index.js',
  'src/database/init.js',
  'src/models/User.js',
  'src/models/Novel.js',
  'src/models/Chapter.js',
  'src/services/ai/AIService.js',
  'src/services/generation/GenerationEngine.js',
  'src/services/epub/EPUBGenerator.js'
];

console.log('\nCore files:');
for (const file of requiredFiles) {
  allPassed &= check(
    file,
    existsSync(join(backendDir, file))
  );
}

// Check data directory will be created
console.log('\nData directory:');
check(
  'data/ directory (will be created on first run)',
  true
);

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log(`\n${colors.green}✓ All checks passed!${colors.reset}`);
  console.log(`\n${colors.blue}Next steps:${colors.reset}`);
  console.log('  1. Review and update .env file');
  console.log('  2. Run: npm start');
  console.log('  3. Visit: http://localhost:3001/health\n');
} else {
  console.log(`\n${colors.red}✗ Some checks failed${colors.reset}`);
  console.log(`\n${colors.yellow}Please fix the issues above and run again${colors.reset}\n`);
  process.exit(1);
}
