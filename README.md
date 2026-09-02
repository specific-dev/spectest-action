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

## Inputs

| Input | Default | Description |
|---|---|---|
| `project` | — | Project id (`proj_…`). Only necessary when one repository backs more than one project. |
| `filter` | — | Run part of the suite. A regular expression matched against test and group names. |
| `version` | `latest` | CLI release to install, e.g. `v0.2.88`. |
| `path` | `.` | Project directory containing `spectest/`. |

