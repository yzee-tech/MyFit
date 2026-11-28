#!/usr/bin/env bash
# The CI shards of the Playwright suite (see shards.txt).
#   shards.sh run <shard>            runs the tests of one shard (1-based)
#   shards.sh check <shard> <total>  checks the shards together run every test exactly once
# check only lists tests (no browser, no server, no database).
set -euo pipefail
set -f # the filters have [ ] in them: never let the shell expand them as file names

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
shards_file="$here/shards.txt"

shard_lines() {
	grep -v -e '^[[:space:]]*#' -e '^[[:space:]]*$' "$shards_file"
}

# The filters of one shard, one per line
filters_of() {
	shard_lines | sed -n "${1}p" | tr ' ' '\n' | grep -v '^$'
}

command="${1:?usage: shards.sh run <shard> | check <shard> <total>}"
index="${2:?usage: shards.sh run <shard> | check <shard> <total>}"
count="$(shard_lines | wc -l)"

if ! [[ "$index" =~ ^[0-9]+$ ]] || [ "$index" -lt 1 ] || [ "$index" -gt "$count" ]; then
	echo "Shard $index is not one of the $count shards in shards.txt" >&2
	exit 1
fi

case "$command" in
run)
	mapfile -t filters < <(filters_of "$index")
	echo "Shard $index of $count runs: ${filters[*]}"
	exec pnpm exec playwright test "${filters[@]}"
	;;
check)
	total="${3:?usage: shards.sh check <shard> <total>}"
	if [ "$total" -ne "$count" ]; then
		echo "The workflow runs $total shards but shards.txt has $count" >&2
		exit 1
	fi
	work="$(mktemp -d)"
	trap 'rm -rf "$work"' EXIT
	# One line per test: "[project] › file:line:column › title"
	list_tests() { pnpm exec playwright test --list "$@" | grep -E '^ +\['; }
	list_tests | sort >"$work/all.txt"
	: >"$work/union.txt"
	parts=""
	for n in $(seq 1 "$count"); do
		mapfile -t filters < <(filters_of "$n")
		list_tests "${filters[@]}" | sort >"$work/shard-$n.txt"
		cat "$work/shard-$n.txt" >>"$work/union.txt"
		parts="$parts shard $n: $(wc -l <"$work/shard-$n.txt");"
	done
	sort -o "$work/union.txt" "$work/union.txt"
	whole=$(wc -l <"$work/all.txt")
	echo "Whole suite: $whole tests;$parts"
	if [ "$whole" -eq 0 ]; then
		echo "No tests were listed: the check cannot tell whether the shards add up" >&2
		exit 1
	fi
	if ! diff "$work/all.txt" "$work/union.txt" >"$work/diff.txt"; then
		echo "The shards do not add up to the whole suite (< in no shard, > in more than one shard):" >&2
		head -20 "$work/diff.txt" >&2
		exit 1
	fi
	echo "The $count shards run every one of the $whole tests exactly once"
	if [ -n "${GITHUB_STEP_SUMMARY:-}" ] && [ "$index" -eq 1 ]; then
		echo "Shards run every test once: whole suite $whole tests;$parts" >>"$GITHUB_STEP_SUMMARY"
	fi
	;;
*)
	echo "Unknown command $command" >&2
	exit 1
	;;
esac
