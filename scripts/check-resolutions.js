#!/usr/bin/env node

/**
 * Script to check if yarn resolutions are still needed.
 * 
 * This script:
 * 1. Checks if resolved packages are still vulnerable
 * 2. Verifies if parent packages have been updated to include safe versions
 * 3. Reports which resolutions might be removable
 * 
 * Usage: node scripts/check-resolutions.js [package.json path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Security-related resolutions with CVE references
const SECURITY_RESOLUTIONS = {
  'ws': { cve: 'CVE-2024-37890', reason: 'Security fix for header count DoS' },
  'js-yaml': { cve: 'CVE-2025-64718', reason: 'Prototype pollution vulnerability' },
  '@babel/helpers': { cve: 'CVE-2025-27789', reason: 'ReDoS vulnerability in regex polyfill' },
  'brace-expansion': { cve: 'CVE-2025-5889', reason: 'ReDoS vulnerability' },
  'sha.js': { cve: 'CVE-2025-9288', reason: 'Input validation vulnerability' },
  'form-data': { cve: 'CVE-2025-7783', reason: 'Math.random() security issue' },
  'minimist': { cve: 'CVE-2021-44906', reason: 'Prototype pollution vulnerability' },
  'glob': { cve: 'CVE-2025-64756', reason: 'Security vulnerability' },
  'tar-fs': { cve: 'CVE-2025-59343', reason: 'Path traversal vulnerability' },
};

// Non-security resolutions (may need manual review)
const NON_SECURITY_RESOLUTIONS = {
  'node-notifier': { reason: 'Build compatibility' },
  'canvas': { reason: 'Build optimization - prevents canvas installation' },
};

function getPackageJson(packageJsonPath) {
  const fullPath = path.resolve(packageJsonPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: ${fullPath} not found`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function getParentPackages(packageName, dir) {
  try {
    const whyResult = execSync(
      `yarn why ${packageName} 2>/dev/null || echo ""`,
      { encoding: 'utf8', cwd: dir, maxBuffer: 1024 * 1024 * 10 }
    );
    
    const parents = [];
    const lines = whyResult.split('\n');
    
    for (const line of lines) {
      // Look for lines like: "package-name#dependency" depends on it
      let match = line.match(/^\s*-\s*"([^"]+)"\s+depends\s+on\s+it/);
      if (match) {
        const parent = match[1];
        // Extract just the direct parent (before #)
        const directParent = parent.split('#')[0];
        if (directParent && !parents.includes(directParent)) {
          parents.push(directParent);
        }
      } else {
        // Look for hoisted packages: "   - Hoisted from "package-name#dependency""
        match = line.match(/Hoisted\s+from\s+"([^"]+)"/);
        if (match) {
          const parent = match[1];
          // Extract just the direct parent (before #)
          const directParent = parent.split('#')[0];
          if (directParent && !parents.includes(directParent) && directParent !== packageName) {
            parents.push(directParent);
          }
        } else {
          // Look for "Specified in" - direct dependency: "   - Specified in "devDependencies""
          match = line.match(/Specified\s+in\s+"([^"]+)"/);
          if (match) {
            const depType = match[1];
            if (depType === 'devDependencies' || depType === 'dependencies') {
              if (!parents.includes('(direct dependency)')) {
                parents.unshift('(direct dependency)');
              }
            }
          }
        }
      }
    }
    
    // Also check if it's a direct dependency
    try {
      const pkgPath = path.join(dir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = getPackageJson(pkgPath);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps[packageName] && !parents.includes('(direct)')) {
          parents.unshift('(direct dependency)');
        }
      }
    } catch (e) {
      // Ignore errors
    }
    
    return parents.slice(0, 5); // Limit to top 5 parents
  } catch (error) {
    return [];
  }
}

function getParentPackageVersions(parentPackages, dir) {
  const versions = {};
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return versions;
    }
    const pkg = getPackageJson(pkgPath);
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    for (const parent of parentPackages) {
      // Try to find version in package.json
      if (allDeps[parent]) {
        versions[parent] = allDeps[parent];
      } else {
        // Try yarn list to get installed version
        try {
          const listResult = execSync(
            `yarn list --pattern "${parent}" --depth=0 2>/dev/null | grep "${parent}@" || echo ""`,
            { encoding: 'utf8', cwd: dir }
          );
          const versionMatch = listResult.match(/@([\d.]+)/);
          if (versionMatch) {
            versions[parent] = versionMatch[1];
          }
        } catch (e) {
          // Ignore errors
        }
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return versions;
}

function checkResolutions(packageJsonPath) {
  const pkg = getPackageJson(packageJsonPath);
  const resolutions = pkg.resolutions || {};
  const dir = path.dirname(packageJsonPath);
  
  console.log(`\n📦 Checking resolutions in ${packageJsonPath}\n`);
  console.log('─'.repeat(80));
  
  if (Object.keys(resolutions).length === 0) {
    console.log('✅ No resolutions found\n');
    return { removable: [], needed: [], unknown: [] };
  }
  
  const results = {
    removable: [],
    needed: [],
    unknown: [],
  };
  
  // Change to package directory to run yarn commands
  process.chdir(dir);
  
  for (const [packageName, version] of Object.entries(resolutions)) {
    // Skip special resolutions like canvas link
    if (version.startsWith('link:')) {
      console.log(`⚠️  ${packageName}: ${version} (special resolution - manual review needed)`);
      results.unknown.push({ package: packageName, version, reason: 'Special resolution' });
      continue;
    }
    
    const securityInfo = SECURITY_RESOLUTIONS[packageName];
    const nonSecurityInfo = NON_SECURITY_RESOLUTIONS[packageName];
    
    // Get parent packages that depend on this package
    const parentPackages = getParentPackages(packageName, dir);
    const parentVersions = getParentPackageVersions(parentPackages, dir);
    
    try {
      // Check if package is still vulnerable
      const auditResult = execSync(
        `yarn audit --json --level moderate 2>/dev/null | grep -i "${packageName}" || echo ""`,
        { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }
      );
      
      // Check what version is actually installed
      const listResult = execSync(
        `yarn list --pattern "${packageName}" --depth=0 2>/dev/null | grep "${packageName}@" || echo ""`,
        { encoding: 'utf8' }
      );
      
      const hasVulnerability = auditResult.trim().length > 0;
      const installedVersion = listResult.match(/@([\d.]+)/)?.[1];
      
      if (securityInfo) {
        if (hasVulnerability) {
          console.log(`🔴 ${packageName}: ${version} - STILL NEEDED (${securityInfo.cve})`);
          console.log(`   Reason: ${securityInfo.reason}`);
          if (installedVersion) {
            console.log(`   Installed: ${installedVersion}`);
          }
          if (parentPackages.length > 0) {
            console.log(`   Parent packages:`);
            parentPackages.forEach(parent => {
              const parentVersion = parentVersions[parent] || 'unknown';
              console.log(`     - ${parent}@${parentVersion}`);
            });
            console.log(`   💡 Update parent packages to versions that include safe ${packageName}`);
          }
          results.needed.push({
            package: packageName,
            version,
            cve: securityInfo.cve,
            reason: securityInfo.reason,
            installedVersion,
            parentPackages: parentPackages.map(p => ({ name: p, version: parentVersions[p] })),
          });
        } else {
          console.log(`🟢 ${packageName}: ${version} - MAY BE REMOVABLE (${securityInfo.cve})`);
          console.log(`   Reason: ${securityInfo.reason}`);
          if (installedVersion) {
            console.log(`   Installed: ${installedVersion}`);
          }
          if (parentPackages.length > 0) {
            console.log(`   Parent packages:`);
            parentPackages.forEach(parent => {
              const parentVersion = parentVersions[parent] || 'unknown';
              console.log(`     - ${parent}@${parentVersion}`);
            });
            console.log(`   💡 Check if parent packages now include safe ${packageName} version`);
          }
          results.removable.push({
            package: packageName,
            version,
            cve: securityInfo.cve,
            reason: securityInfo.reason,
            installedVersion,
            parentPackages: parentPackages.map(p => ({ name: p, version: parentVersions[p] })),
          });
        }
      } else if (nonSecurityInfo) {
        console.log(`⚠️  ${packageName}: ${version} - MANUAL REVIEW NEEDED`);
        console.log(`   Reason: ${nonSecurityInfo.reason}`);
        if (parentPackages.length > 0) {
          console.log(`   Parent packages:`);
          parentPackages.forEach(parent => {
            const parentVersion = parentVersions[parent] || 'unknown';
            console.log(`     - ${parent}@${parentVersion}`);
          });
        }
        results.unknown.push({
          package: packageName,
          version,
          reason: nonSecurityInfo.reason,
          parentPackages: parentPackages.map(p => ({ name: p, version: parentVersions[p] })),
        });
      } else {
        console.log(`❓ ${packageName}: ${version} - UNKNOWN REASON`);
        if (parentPackages.length > 0) {
          console.log(`   Parent packages:`);
          parentPackages.forEach(parent => {
            const parentVersion = parentVersions[parent] || 'unknown';
            console.log(`     - ${parent}@${parentVersion}`);
          });
        }
        results.unknown.push({
          package: packageName,
          version,
          reason: 'No documentation found',
          parentPackages: parentPackages.map(p => ({ name: p, version: parentVersions[p] })),
        });
      }
    } catch (error) {
      console.log(`⚠️  ${packageName}: ${version} - Could not check (${error.message})`);
      results.unknown.push({
        package: packageName,
        version,
        reason: `Check failed: ${error.message}`,
      });
    }
    console.log('');
  }
  
  console.log('─'.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   🔴 Still needed: ${results.needed.length}`);
  console.log(`   🟢 Potentially removable: ${results.removable.length}`);
  console.log(`   ⚠️  Needs manual review: ${results.unknown.length}\n`);
  
  if (results.removable.length > 0) {
    console.log('💡 To test removing a resolution:');
    console.log('   1. Remove it from package.json');
    console.log('   2. Run: yarn install');
    console.log('   3. Run: yarn audit');
    console.log('   4. If no vulnerabilities appear, the resolution can be removed\n');
  }
  
  return results;
}

// Main execution
const packageJsonPath = process.argv[2] || 'package.json';
const results = checkResolutions(packageJsonPath);

// Exit with error code if there are removable resolutions (to remind developers)
if (results.removable.length > 0) {
  console.log('⚠️  Some resolutions may be removable. Review and test before removing.\n');
  process.exit(0); // Don't fail CI, just warn
}

process.exit(0);

