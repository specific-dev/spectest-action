# Github Action for Spectest

Run your [Spectest](https://docs.specific.dev/spectest) suite in GitHub Actions. Use this when you want to only run your Spectest suite in certain situations or as part of a larger pipeline.

## Installation

### Connect your project to Github

1. Open the [dashboard](https://spectest.specific.dev) and open the settings page
2. Click "Install the Github app" and connect the repo you will be running your actions from
3. Disable "Run the suite automatically on every push"

## Add to your Github Actions workflow

Add the Github Action as a step to your pipeline. For example:

```yaml
name: "Run tests"

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: specific-dev/spectest-action@v1
```

## Running part of the suite

The `filter` input takes a regular expression which is matched against the names of your
tests and groups.

This example will run all tests and groups that contain the term "checkout":

```yaml
      - uses: specific-dev/spectest-action@v1
        with:
          filter: "checkout"
```

- A matching test runs with its ancestors and a matching group runs every test in it, including tests nested under
  its members.
- Matching is unanchored and case-insensitive by default. Add anchors if needed, for example `filter: "^checkout$"`.
- A pattern that matches nothing fails the test run

The dialect is Rust's [`regex` crate](https://docs.rs/regex/latest/regex/#syntax).

## Allow failures already present in a PR's base run

Opt in when unrelated failures on the base branch should not block a PR:

```yaml
      - uses: specific-dev/spectest-action@v1
        with:
          ignore-preexisting-failures: 'true'
```

Requires an Action revision containing this input, CLI v0.2.160 or newer, and
server support. If you pin `version`, update it too. The default is `false`.

The CLI verifies that the run belongs to a pull request and compares failed
tests with its resolved base run. Every failure must have the same test id and
exact error message. The Action job passes and logs the baseline, while the
Spectest run and test results remain failed. The PR comment adds a footnote
linking the base run and explaining the enabled option. Runs on main keep failing normally.

New or different failures, infrastructure errors, dirty checkouts, and missing
or incomplete baselines still fail. The baseline must be a clean, completed,
unfiltered run at the PR's merge-base; Run diffs must be enabled. A base run
that finishes later requires rerunning the job. Old servers retain the failing
exit status. Disable automatic GitHub App push runs as described above: this
input changes the Action's exit status, not the App's separate checks.

## Inputs

| Input | Default | Description |
|---|---|---|
| `project` | — | Project id (`proj_…`). Only necessary when one repository backs more than one project. |
| `filter` | — | Run part of the suite. A regular expression matched against test and group names. |
| `ignore-preexisting-failures` | `false` | Allow matching base-run failures on pull requests (CLI v0.2.160+). |
| `version` | `latest` | CLI release to install, e.g. `v0.2.88`. |
| `path` | `.` | Project directory containing `spectest/`. |

