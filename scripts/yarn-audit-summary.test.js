const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatAuditFailureReport,
  getAuditOptions,
} = require('./yarn-audit-summary');

test('getAuditOptions returns the shared defaults', () => {
  assert.deepEqual(getAuditOptions(), {
    level: 'moderate',
    groups: ['dependencies', 'optionalDependencies'],
  });
});

test('formatAuditFailureReport groups duplicate advisories and shows concise paths', () => {
  const report = formatAuditFailureReport([
    JSON.stringify({
      type: 'auditAdvisory',
      data: {
        resolution: { path: 'jimp>@jimp/core>file-type' },
        advisory: {
          module_name: 'file-type',
          severity: 'moderate',
          github_advisory_id: 'GHSA-5v7r-6r5c-r473',
          cves: ['CVE-2026-31808'],
          recommendation: 'Upgrade to version 21.3.1 or later',
        },
      },
    }),
    JSON.stringify({
      type: 'auditAdvisory',
      data: {
        resolution: { path: 'jimp>@jimp/plugin-resize>@jimp/core>file-type' },
        advisory: {
          module_name: 'file-type',
          severity: 'moderate',
          github_advisory_id: 'GHSA-5v7r-6r5c-r473',
          cves: ['CVE-2026-31808'],
          recommendation: 'Upgrade to version 21.3.1 or later',
        },
      },
    }),
  ]);

  assert.deepEqual(report, [
    'Blocking advisories:',
    '- moderate | file-type | GHSA-5v7r-6r5c-r473, CVE-2026-31808 | fix: Upgrade to version 21.3.1 or later | paths: 2',
    '  - jimp>@jimp/core>file-type',
    '  - jimp>@jimp/plugin-resize>@jimp/core>file-type',
  ]);
});

test('formatAuditFailureReport handles advisories without CVEs', () => {
  const report = formatAuditFailureReport([
    JSON.stringify({
      type: 'auditAdvisory',
      data: {
        resolution: { path: 'eslint>tmp' },
        advisory: {
          module_name: 'tmp',
          severity: 'high',
          github_advisory_id: 'GHSA-example',
          cves: [],
          recommendation: 'Upgrade to version 0.2.4 or later',
        },
      },
    }),
  ]);

  assert.deepEqual(report, [
    'Blocking advisories:',
    '- high | tmp | GHSA-example | fix: Upgrade to version 0.2.4 or later | paths: 1',
    '  - eslint>tmp',
  ]);
});
