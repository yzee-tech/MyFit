# Safe first-failure evidence

CI writes `playwright-diagnostics/`. The upload runs even when the test command fails, but only after
`safe-artifacts.cjs` validates every file. It never uploads `test-results/` or `playwright-report/`.

- Each attempt has a JSON record: test source/line, retry index, outcome, duration, up to 500 step timings,
  fixed action categories/operations, and up to 200 fixed UI-state changes.
- Unexpected failures also have an action-only `.zip` timeline. Open it with `pnpm exec playwright show-trace`.
  This is a Trace Viewer projection built from the validated JSON, not a full raw trace. The blank page preview
  is intentional: it contains no screenshots, snapshots, network events, source files, arguments, URLs or raw errors.
- The page fixture passively watches cardio and exercise tests for Run/Bike checkbox states, Add count,
  Run/Bike menu visibility, and Pick/New button visibility, picker expansion and search visibility. State times are relative to the test start. A checkbox
  not currently in the filtered DOM has `*CheckboxVisible: false`; its `*Checked: false` is not proof it was unticked.
- The state buffer belongs to the current document. Navigation resets it. A closed/crashed page may produce no
  states; that is missing evidence, not proof a button or selection was absent. Timings still come from the runner.
- Timings are bounded and omit raw action titles. UI observation adds no polling, clicks, waits, routes or app changes.
  Normal test timeout, retry and fail-on-flaky settings are unchanged. Native raw artifacts stay local and are not uploaded.
- The strict validator rejects extra fields, wrong types, unexpected paths and any zip entry other than the exact
  generated timeline. It verifies decompressed trace bytes against a fresh projection of the validated JSON.

Run `node --test tests/diagnostics/capture.test.cjs` to exercise an actual locator timeout followed by a passing
retry. It verifies the first failure's state/timeline survive, the runner still exits 1 for flaky results, sentinel
secrets never reach the safe record, and unexpected artifact content is rejected. It uses local Chromium and Python 3
(the standard library only). This test does not need the app or database.

The two `tests/helpers/quickAdd.spec.ts` cases check the helper contract with synthetic UI. They do not reproduce
or diagnose the historical CI flake. The actual cardio test and full CI remain separate integration checks.
