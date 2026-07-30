#!/usr/bin/env python3
"""Patch pip's vendored SBOM/deps that Trivy still flags.

pip 26.2 vendors msgpack 1.1.2 (GHSA-6v7p-g79w-8964) and lists setuptools
70.3.0 in vendor.txt / bom.cdx.json (CVE-2025-47273) even when the
top-level installs are already fixed. Trivy reads bom.cdx.json.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import msgpack


def patch_vendor_dir(pip_vendor: Path) -> None:
    src = Path(msgpack.__file__).resolve().parent
    dst = pip_vendor / "msgpack"
    if dst.exists():
        shutil.rmtree(dst)
        shutil.copytree(src, dst)

    vendor_txt = pip_vendor / "vendor.txt"
    if vendor_txt.exists():
        vendor_txt.write_text(
            vendor_txt.read_text()
            .replace("msgpack==1.1.2", "msgpack==1.2.1")
            .replace("setuptools==70.3.0", "setuptools==83.0.0")
        )

    # CycloneDX SBOM is what Trivy indexes for these pins.
    (pip_vendor / "bom.cdx.json").unlink(missing_ok=True)
    print(f"patched {pip_vendor}")


def candidate_vendor_dirs() -> list[Path]:
    # Keep this narrow — rglob over /usr on the GDAL image is huge.
    candidates = [
        Path("/usr/local/lib"),
        Path("/.venv"),
        Path("/opt/poetry"),
    ]
    found: list[Path] = []
    seen: set[Path] = set()
    for root in candidates:
        if not root.exists():
            continue
        for vendor in root.rglob("pip/_vendor"):
            vendor = vendor.resolve()
            if vendor in seen or not (vendor / "vendor.txt").exists():
                continue
            seen.add(vendor)
            found.append(vendor)
    return found


def main() -> None:
    found = candidate_vendor_dirs()
    if not found:
        print("no pip/_vendor trees found", file=sys.stderr)
        sys.exit(1)
    for vendor in found:
        patch_vendor_dir(vendor)


if __name__ == "__main__":
    main()
