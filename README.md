# GitHub Action to Release Code for Foundry Systems and Modules

This GitHub Action enables you to release a Foundry VTT System or Module by simply updating the 'version.txt' file in your main branch.

Example workflow:

```
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
        uses: actions/checkout@v2
      - name: Foundry Release
        id: foundry-release
        uses: foundryvtt-dcc/foundry-release-action@main
        with:
          actionToken: ${{ secrets.GITHUB_TOKEN }}
          manifestFileName: 'system.json'
```

For `manifestFileName` you will either supply `system.json` or `module.json` depending on your project.

You should not need to change `actionToken` from the example above.