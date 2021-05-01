const core = require('@actions/core')
const github = require('@actions/github')
const fs = require('fs')

async function createRelease () {
  // Create Release
  const actionToken = core.getInput('actionToken')
  const octokit = github.getOctokit(actionToken)

  try {
    const createReleaseResponse = await octokit.rest.repos.createRelease({
      owner: 'foundryvtt-dcc',
      repo: 'foundry-release-action-testbed',
      tag_name: 'v0.0',
      name: 'test release',
      body: 'test release',
      draft: true,
      prerelease: true
    })

    console.log(createReleaseResponse)
  } catch
    (error) {
    core.setFailed(error.message)
  }
}

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`)

  // Replace Data in Manifest
  data = fs.readFileSync('system.json', 'utf8')
  let formatted = data.replace(/{{VERSION}}/g, '0.1')
  fs.writeFileSync('system.json', formatted, 'utf8')

  createRelease()

} catch
  (error) {
  core.setFailed(error.message)
}