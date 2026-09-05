#!/usr/bin/env bash
# Compare two directory trees by content hash, ignoring macOS junk files
# (.DS_Store, AppleDouble ._* files) so cosmetic differences don't mask
# whether the real content is identical.
#
# Usage: ./compare_folder_hashes.sh "/path/to/dir A" "/path/to/dir B"
#
# Prints:
#   - real file count in each dir
#   - paths only in A
#   - paths only in B
#   - paths in both but with different content (hash mismatch)
# Exits 0 if the dirs are content-identical, 1 otherwise.
#
# Example use case: you have several backup copies of an old "Sites" folder
# (e.g. from restoring multiple Time Machine snapshots) and want to know if
# two of them can be collapsed into one before deleting the duplicate:
#
#   ./compare_folder_hashes.sh "/Volumes/Backup/sites 3" "/Volumes/Backup/sites 12"
#
#   Real files in '/Volumes/Backup/sites 3': 113
#   Real files in '/Volumes/Backup/sites 12': 172
#
#   === Only in '/Volumes/Backup/sites 12' ===
#   viralmedianetwork.com backup/index.php
#   viralmedianetwork.com backup/team.php
#   ...
#
# That output tells you "sites 12" is a superset of "sites 3" (nothing is
# only in "sites 3", and no shared path has conflicting content) -- so it's
# safe to keep "sites 12" and discard "sites 3".

set -euo pipefail

if [ $# -ne 2 ]; then
  echo "Usage: $0 <dirA> <dirB>" >&2
  exit 2
fi

DIR_A=$1
DIR_B=$2
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

hash_tree() {
  local dir=$1
  local out=$2
  find "$dir" -type f \( ! -name '.DS_Store' ! -name '._*' \) -print0 |
    while IFS= read -r -d '' f; do
      rel="${f#$dir/}"
      h=$(shasum -a 256 "$f" | awk '{print $1}')
      # tab-separated so paths with spaces stay intact
      printf '%s\t%s\n' "$h" "$rel"
    done | sort -k2 > "$out"
}

hash_tree "$DIR_A" "$TMP/a.tsv"
hash_tree "$DIR_B" "$TMP/b.tsv"

count_a=$(wc -l < "$TMP/a.tsv" | tr -d ' ')
count_b=$(wc -l < "$TMP/b.tsv" | tr -d ' ')
echo "Real files in '$DIR_A': $count_a"
echo "Real files in '$DIR_B': $count_b"

cut -f2 "$TMP/a.tsv" | sort > "$TMP/paths_a.txt"
cut -f2 "$TMP/b.tsv" | sort > "$TMP/paths_b.txt"

only_a=$(comm -23 "$TMP/paths_a.txt" "$TMP/paths_b.txt")
only_b=$(comm -13 "$TMP/paths_a.txt" "$TMP/paths_b.txt")

status=0

if [ -n "$only_a" ]; then
  echo
  echo "=== Only in '$DIR_A' ==="
  echo "$only_a"
  status=1
fi

if [ -n "$only_b" ]; then
  echo
  echo "=== Only in '$DIR_B' ==="
  echo "$only_b"
  status=1
fi

# For paths present in both, compare hashes
mismatches=$(join -t $'\t' -1 2 -2 2 \
  <(sort -k2 -t $'\t' -k1 "$TMP/a.tsv" | awk -F'\t' '{print $2"\t"$1}' | sort -t$'\t' -k1,1) \
  <(sort -k2 -t $'\t' -k1 "$TMP/b.tsv" | awk -F'\t' '{print $2"\t"$1}' | sort -t$'\t' -k1,1) \
  2>/dev/null | awk -F'\t' '$2 != $3 {print $1}' || true)

if [ -n "$mismatches" ]; then
  echo
  echo "=== Same path, different content ==="
  echo "$mismatches"
  status=1
fi

if [ "$status" -eq 0 ]; then
  echo
  echo "MATCH: directories are content-identical (junk files ignored)"
fi

exit "$status"
