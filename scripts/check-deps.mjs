#!/usr/bin/env node
/**
 * Deterministic dependency weight + package sanity check.
 * Shared by CI, bash harness, and PowerShell verify.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

console.log(`Package check OK: ${pkg.name} v${pkg.version}`);

const forbidden = ['@google/genai', 'recharts', 'motion', '@supabase/supabase-js'];
const found = forbidden.filter((dep) => pkg.dependencies?.[dep]);

if (found.length > 0) {
    console.error('Forbidden heavy dependencies detected in package.json:', found);
    process.exit(1);
}

console.log('Dependency weight check PASSED (clean demo footprint).');
