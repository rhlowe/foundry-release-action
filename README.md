# GitHub Action to Release Code for Foundry Systems and Modules

This GitHub Action enables you to release a Foundry VTT System or Module by simply updating the 'version.txt' file in your main branch.

## Install Instructions

Create a folder named `.github` at the root of your workflow, and inside that folder, create a `workflows` folder.

In the `workflows` folder, create a file named `foundry_release.yml` with this content:

```
name: Create Foundry Release

on:
  push:
    paths:
      - 'version.txt'

jobs:
  create_foundry_release:
    runs-on: ubuntu-latest
    name: Foundry Release
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Foundry Release
        id: foundry-release
        uses: foundryvtt-dcc/foundry-release-action@main
        with:
          actionToken: ${{ secrets.GITHUB_TOKEN }}
          manifestFileName: 'system.json'
```

For `manifestFileName` you will either enter `system.json` or `module.json` depending on your project.

You should not need to change `actionToken` from the example above.

Create a file named `version.txt` at the root of your project, with your desired version number in it (without the `v`) - e.g. `0.20.0`.

## Creating a Release
When that `version.txt` file is updated, this workflow will create a draft release, including a log of all commits since the last release.  You will need to edit that release with your preferred description, and then publish it.