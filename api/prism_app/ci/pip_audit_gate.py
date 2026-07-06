"""Fail when pip-audit finds vulnerabilities (CI parity with api_lint)."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

AUDIT_JSON = Path("audit_results.json")
IGNORE_VULN = "PYSEC-2025-183"


def main() -> None:
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip_audit",
            "--desc",
            "--format",
            "json",
            f"--ignore-vuln={IGNORE_VULN}",
            "--output",
            str(AUDIT_JSON),
        ],
        check=False,
    )

    data = json.loads(AUDIT_JSON.read_text() or "{}")
    vulnerable_dependencies = [
        dependency
        for dependency in data.get("dependencies", [])
        if dependency.get("vulns")
    ]

    if not vulnerable_dependencies:
        print("✅ No vulnerabilities found")
        return

    print(f"❌ Found vulnerable packages: {len(vulnerable_dependencies)}")
    for dependency in vulnerable_dependencies:
        advisory_ids = sorted(
            {
                advisory
                for vuln in dependency["vulns"]
                for advisory in [vuln.get("id"), *(vuln.get("aliases") or [])]
                if advisory
            }
        )
        fixed_versions = sorted(
            {
                version
                for vuln in dependency["vulns"]
                for version in (vuln.get("fix_versions") or [])
                if version
            }
        )
        print(
            f"- {dependency['name']}@{dependency['version']} | "
            f"{', '.join(advisory_ids)} | "
            f"fix: {', '.join(fixed_versions) or 'none listed'}"
        )

    sys.exit(1)


if __name__ == "__main__":
    main()
