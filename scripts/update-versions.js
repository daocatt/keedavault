import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read version from package.json (which is already updated by npm version)
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

console.log(`Syncing version ${version} to Tauri configuration files...`);

// 1. Update src-tauri/tauri.conf.json
const tauriConfPath = join(rootDir, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf8'));
tauriConf.version = version;
// Tauri 2 structure might have version in bundle? No, conventionally top-level or package.version
// Let's check where it was: line 29 "version": "0.2.1" in previous view
// It is top-level.
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
console.log('✓ Updated src-tauri/tauri.conf.json');

// 2. Update src-tauri/Cargo.toml
const cargoTomlPath = join(rootDir, 'src-tauri', 'Cargo.toml');
let cargoToml = readFileSync(cargoTomlPath, 'utf8');
// Replace version = "x.y.z" with new version
// Use regex to find version under [package]
cargoToml = cargoToml.replace(/^version = "[^"]+"/m, `version = "${version}"`);
writeFileSync(cargoTomlPath, cargoToml);
console.log('✓ Updated src-tauri/Cargo.toml');

// 3. Update Cargo.lock
// We need to run cargo check to update the lock file with the new version
try {
    console.log('Running cargo check to update Cargo.lock...');
    execSync('cargo check', { cwd: join(rootDir, 'src-tauri'), stdio: 'ignore' });
    console.log('✓ Updated src-tauri/Cargo.lock');
} catch (e) {
    console.warn('⚠️ Failed to update Cargo.lock (is cargo installed?). Proceeding without it.');
}

// 4. Git add the changed files
const cargoLockPath = join(rootDir, 'src-tauri', 'Cargo.lock');
try {
    execSync(`git add "${tauriConfPath}" "${cargoTomlPath}" "${cargoLockPath}"`);
    console.log('✓ Staged changes for commit');
} catch (e) {
    console.error('Failed to git add files:', e);
    process.exit(1);
}

console.log(`Successfully synced version ${version}`);
