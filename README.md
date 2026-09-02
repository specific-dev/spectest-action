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

## Inputs

| Input | Default | Description |
|---|---|---|
| `project` | — | Project id (`proj_…`). Only necessary when one repository backs more than one project. |
| `filter` | — | Run part of the suite. A regular expression matched against test and group **names** — see below. |
| `version` | `latest` | CLI release to install, e.g. `v0.2.88`. |
| `path` | `.` | Project directory containing `spectest/`. |

## Running part of the suite

`filter` takes a regular expression, matched against the **names** of your
tests and groups — the names the case tree prints. It does not match ids.

```yaml
      - uses: specific-dev/spectest-action@v1
        with:
          filter: "^checkout$"
```

- A matching **test** runs with its ancestors. A test runs in a fork of its
  parent's state, so the chain above it always comes along.
- A matching **group** runs every test in it, including tests nested under
  its members. So a group can run more than any single test inside it.
- Matching is unanchored: `checkout` also matches `checkout guest`. Write
  `^checkout$` for exactly one test.
- A pattern that matches nothing **fails the step**, listing the names that
  exist. It never passes as an empty run.

The dialect is Rust's [`regex` crate](https://docs.rs/regex/latest/regex/#syntax):
alternation, anchors, character classes and `(?i)` all work, but there is no
lookaround and no backreferences.

> The `case` input has been removed. It selected a test by id; `filter`
> matches names, so a workflow that still sets `case` fails with a message
> rather than quietly running the whole suite. Replace it with `filter`.
