#!/usr/bin/env python3
"""Merge N directory trees into one, deduplicating by content hash.

For every relative path found across the source directories:
  - if it appears in only one source, copy it as-is
  - if it appears in multiple sources with identical content (same SHA-256),
    copy it once (no data loss, nothing to choose between)
  - if it appears in multiple sources with DIFFERENT content, copy every
    version into the destination with a "(CONFLICT-<source>)" suffix so nothing
    is silently discarded, and report it for manual review

Usage:
  python3 merge_folder_contents.py <dest_dir> <source_dir> [<source_dir> ...]

Prints a JSON summary: total unique paths, files copied, duplicate copies
skipped, and any conflicts (path + which sources disagreed).

Example use case: three old backup copies of a "Sites" folder each grew
their own extra content over the years (one has an extra project folder,
another has an extra site backup) and you want a single folder with
everything, without silently overwriting a divergent file:

  python3 merge_folder_contents.py \
      "/Volumes/Backup/sites merged" \
      "/Volumes/Backup/sites 12" \
      "/Volumes/Backup/Sites 8" \
      "/Volumes/Backup/Sites 9"

  Scanning /Volumes/Backup/sites 12...
  Scanning /Volumes/Backup/Sites 8...
  Scanning /Volumes/Backup/Sites 9...
  {
    "total_unique_paths": 5743,
    "files_copied": 5743,
    "duplicate_copies_skipped": 658,
    "conflicts": [],
    "per_source_counts": {
      "/Volumes/Backup/sites 12": 172,
      "/Volumes/Backup/Sites 8": 897,
      "/Volumes/Backup/Sites 9": 5332
    }
  }

Zero conflicts means every file that existed in more than one source was
byte-identical everywhere -- so it's safe to trash the three originals
once "sites merged" has been spot-checked.
"""

import os
import sys
import hashlib
import shutil
import json


def is_junk(name: str) -> bool:
    return name == ".DS_Store" or name.startswith("._")


def hash_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def scan(root: str) -> dict:
    manifest = {}
    for dirpath, _dirnames, filenames in os.walk(root):
        for fn in filenames:
            if is_junk(fn):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            try:
                manifest[rel] = hash_file(full)
            except OSError as e:
                manifest[rel] = f"ERROR:{e}"
    return manifest


def merge(dest: str, sources: list[str]) -> dict:
    manifests = {s: scan(s) for s in sources}

    all_rels = set()
    for m in manifests.values():
        all_rels.update(m.keys())

    os.makedirs(dest, exist_ok=True)
    copied = 0
    skipped_dup = 0
    conflicts = []

    for rel in sorted(all_rels):
        present = [(s, manifests[s][rel]) for s in sources if rel in manifests[s]]
        hashes = {h for _, h in present}
        dest_path = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)

        if len(hashes) == 1:
            src_s, _ = present[0]
            src_path = os.path.join(src_s, rel)
            if not os.path.exists(dest_path):
                shutil.copy2(src_path, dest_path)
                copied += 1
            if len(present) > 1:
                skipped_dup += len(present) - 1
        else:
            for src_s, h in present:
                src_path = os.path.join(src_s, rel)
                name, ext = os.path.splitext(rel)
                tag = os.path.basename(src_s.rstrip("/")).replace(" ", "_")
                conflict_rel = f"{name} (CONFLICT-{tag}){ext}"
                conflict_dest = os.path.join(dest, conflict_rel)
                os.makedirs(os.path.dirname(conflict_dest), exist_ok=True)
                shutil.copy2(src_path, conflict_dest)
                copied += 1
            conflicts.append(
                {
                    "path": rel,
                    "sources": [s for s, _ in present],
                    "hashes": dict(present),
                }
            )

    return {
        "total_unique_paths": len(all_rels),
        "files_copied": copied,
        "duplicate_copies_skipped": skipped_dup,
        "conflicts": conflicts,
        "per_source_counts": {s: len(m) for s, m in manifests.items()},
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <dest_dir> <source_dir> [<source_dir> ...]", file=sys.stderr)
        sys.exit(2)

    dest_dir = sys.argv[1]
    source_dirs = sys.argv[2:]

    for s in source_dirs:
        print(f"Scanning {s}...", file=sys.stderr)

    result = merge(dest_dir, source_dirs)
    print(json.dumps(result, indent=2))
