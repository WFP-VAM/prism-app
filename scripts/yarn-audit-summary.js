#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

// No compatible patched release:
// - extract-zip symlink traversal. Latest npm is still 2.0.1. Cypress 15 pins
//   that exact version (Chrome zip unpack, not untrusted user archives).
//   Cypress 16 drops the dependency; that is a major e2e bump, not done here.
//   CI audits dependencies only, so this devDependency does not fail the job.
// sprintf-js GHSA-hp3w-g68c-fv3c was withdrawn (Oct 2026). Yarn no longer reports it.
const IGNORE_ADVISORIES = new Set([
  'GHSA-jmr9-qjv8-65gv', // CVE-2026-56876 extract-zip
]);

function getAuditOptions() {
  return {
    level: 'moderate',
    groups: ['dependencies', 'optionalDependencies'],
  };
}

function advisoryIgnoreIds(advisory) {
  return [advisory.github_advisory_id, ...(advisory.cves || [])].filter(Boolean);
}

function isIgnoredAdvisory(advisoryData) {
  const advisory = advisoryData.advisory || {};
  return advisoryIgnoreIds(advisory).some((id) => IGNORE_ADVISORIES.has(id));
}

function parseAuditLines(lines) {
  return lines
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((entry) => entry.type === 'auditAdvisory')
    .map((entry) => entry.data);
}

function formatAuditFailureReport(lines) {
  const advisories = parseAuditLines(lines).filter(
    (entry) => !isIgnoredAdvisory(entry),
  );
  const grouped = new Map();

  for (const advisoryData of advisories) {
    const advisory = advisoryData.advisory || {};
    const pathValue = advisoryData.resolution?.path || '(unknown path)';
    const ids = [
      advisory.github_advisory_id,
      ...(advisory.cves || []),
      ...(advisory.cvss ? [] : []),
    ].filter(Boolean);
    const key = [
      advisory.severity || 'unknown',
      advisory.module_name || '(unknown module)',
      ids.join(','),
      advisory.recommendation || 'none listed',
    ].join('|');

    if (!grouped.has(key)) {
      grouped.set(key, {
        severity: advisory.severity || 'unknown',
        moduleName: advisory.module_name || '(unknown module)',
        ids,
        recommendation: advisory.recommendation || 'none listed',
        paths: [],
      });
    }

    grouped.get(key).paths.push(pathValue);
  }

  const linesOut = ['Blocking advisories:'];
  for (const entry of grouped.values()) {
    const uniquePaths = [...new Set(entry.paths)].sort();
    linesOut.push(
      `- ${entry.severity} | ${entry.moduleName} | ${entry.ids.join(', ') || 'unknown advisory'} | fix: ${entry.recommendation} | paths: ${uniquePaths.length}`,
    );
    for (const advisoryPath of uniquePaths) {
      linesOut.push(`  - ${advisoryPath}`);
    }
  }

  return linesOut;
}

function run() {
  const { level, groups } = getAuditOptions();
  // Windows: .cmd shims are not valid spawn targets without a shell (spawnSync → EINVAL).
  const spawnOptions = {
    cwd: process.cwd(),
    encoding: 'utf8',
    ...(process.platform === 'win32' ? { shell: true } : {}),
  };

  const result = spawnSync(
    'yarn',
    ['audit', '--json', '--level', level, '--groups', ...groups],
    spawnOptions,
  );

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let advisories = [];
  try {
    advisories = parseAuditLines(lines).filter((entry) => !isIgnoredAdvisory(entry));
  } catch (error) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    console.error(`Failed to parse yarn audit output: ${error.message}`);
    process.exit(result.status || 1);
  }

  if (result.error) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    console.error(result.error.message);
    process.exit(1);
  }

  if (advisories.length === 0) {
    console.log('Passed yarn security audit.');
    process.exit(0);
  }

  console.log(formatAuditFailureReport(lines).join('\n'));
  process.exit(1);
}

if (require.main === module) {
  run();
}

module.exports = {
  IGNORE_ADVISORIES,
  formatAuditFailureReport,
  getAuditOptions,
  isIgnoredAdvisory,
};
