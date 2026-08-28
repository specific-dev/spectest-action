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
| `case` | — | Run one test case (its id) and its parents. |
