#!/usr/bin/env node
/**
 * Lightweight committed-secret hygiene check for CI.
 * Fails on high-confidence live credential patterns in tracked source files.
 * Allows obvious fixtures/placeholders (fake, mock, xxxx, example, test).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execSync('git ls-files', { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((path) => !path.startsWith('node_modules/'))
    .filter((path) => !path.startsWith('dist/'))
    .filter((path) => !path.endsWith('package-lock.json'))
    .filter((path) => !/\.(png|jpg|jpeg|webp|gif|ico|svg)$/i.test(path));

const patterns = [
    { name: 'GitHub PAT', re: /ghp_[A-Za-z0-9_]{20,}/g },
    { name: 'OpenAI-like key', re: /sk-(?:proj-)?[A-Za-z0-9]{20,}/g },
    { name: 'Anthropic-like key', re: /sk-ant-[A-Za-z0-9_-]{20,}/g },
    { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/g },
    { name: 'Supabase/JWT-like', re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
];

const allowHint = /(fake|mock|example|sample|placeholder|test|demo|x{4,})/i;
const findings = [];

for (const path of tracked) {
    let text;
    try {
        text = readFileSync(path, 'utf8');
    } catch {
        continue;
    }

    for (const { name, re } of patterns) {
        re.lastIndex = 0;
        for (const match of text.matchAll(re)) {
            const value = match[0];
            if (allowHint.test(value) || allowHint.test(path)) continue;
            findings.push({ path, name, value: `${value.slice(0, 12)}…` });
        }
    }
}

if (findings.length > 0) {
    console.error('Potential committed secrets detected:');
    for (const f of findings) {
        console.error(`- [${f.name}] ${f.path}: ${f.value}`);
    }
    process.exit(1);
}

console.log(`Secret hygiene check PASSED (${tracked.length} tracked files scanned).`);
