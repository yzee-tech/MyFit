#!/usr/bin/env bash
# Checks that the Playwright shards together run every test exactly once: the list of tests of shards
# 1..TOTAL, put together, must equal the list of the whole suite (a test dropped or run twice fails it).
# Only lists tests (no browser, no server, no database). Usage: shard-coverage.sh <this shard> <total shards>
set -euo pipefail

index="${1:?usage: shard-coverage.sh <this shard> <total shards>}"
total="${2:?usage: shard-coverage.sh <this shard> <total shards>}"

if ! [[ "$index" =~ ^[0-9]+$ && "$total" =~ ^[0-9]+$ ]] || [ "$index" -lt 1 ] || [ "$index" -gt "$total" ]; then
	echo "Shard $index of $total is not a valid shard" >&2
	exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# One line per test: "[project] › file:line:column › title"
list_tests() {
	pnpm exec playwright test --list "$@" | grep -E '^ +\['
}

list_tests | sort >"$work/all.txt"
: >"$work/union.txt"
for n in $(seq 1 "$total"); do
	list_tests --shard="$n/$total" | sort >"$work/shard-$n.txt"
	cat "$work/shard-$n.txt" >>"$work/union.txt"
done
sort -o "$work/union.txt" "$work/union.txt"

whole=$(wc -l <"$work/all.txt")
parts=""
for n in $(seq 1 "$total"); do
	parts="$parts shard $n: $(wc -l <"$work/shard-$n.txt");"
done
echo "Whole suite: $whole tests;$parts"

if [ "$whole" -eq 0 ]; then
	echo "No tests were listed: the check cannot tell whether the shards add up" >&2
	exit 1
fi

if ! diff "$work/all.txt" "$work/union.txt" >"$work/diff.txt"; then
	echo "The shards do not add up to the whole suite (< only in the whole suite, > run by more than one shard or only in a shard):" >&2
	head -20 "$work/diff.txt" >&2
	exit 1
fi

echo "The $total shards run every one of the $whole tests exactly once"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ] && [ "$index" -eq 1 ]; then
	echo "Shards run every test once: whole suite $whole tests;$parts" >>"$GITHUB_STEP_SUMMARY"
fi
