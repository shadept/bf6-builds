#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const WEAPONS_CACHE_DIR = path.join(CACHE_DIR, 'weapons');
const PREMIUM_MODIFIERS_CACHE_DIR = path.join(CACHE_DIR, 'premium-modifiers');

console.log('🔄 Full Cache Refresh\n');
console.log('='.repeat(50));

// Delete cached weapons
if (fs.existsSync(WEAPONS_CACHE_DIR)) {
  console.log('🗑️  Deleting cached weapons...');
  fs.rmSync(WEAPONS_CACHE_DIR, { recursive: true, force: true });
  console.log('   ✓ Deleted weapons cache');
} else {
  console.log('⊘  No weapons cache to delete');
}

// Delete cached premium modifiers
if (fs.existsSync(PREMIUM_MODIFIERS_CACHE_DIR)) {
  console.log('🗑️  Deleting cached premium modifiers...');
  fs.rmSync(PREMIUM_MODIFIERS_CACHE_DIR, { recursive: true, force: true });
  console.log('   ✓ Deleted premium modifiers cache');
} else {
  console.log('⊘  No premium modifiers cache to delete');
}

console.log('='.repeat(50));
console.log('\n📥 Fetching fresh data from API...\n');

// Run the preload-cache script
try {
  execSync('npx tsx scripts/preload-cache.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('\n' + '='.repeat(50));
  console.log('🔨 Generating weapon details...');

  execSync('npx tsx scripts/generate-weapon-details.ts', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ Cache refresh complete!');
  console.log('='.repeat(50));
  console.log('\nYou can now run: npm run precompute');
} catch (error) {
  console.error('\n❌ Failed to refresh cache');
  process.exit(1);
}
