const core = require('@actions/core')
const github = require('@actions/github')
const shell = require('shelljs')
const fs = require('fs')
const actionToken = core.getInput('actionToken')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name

async function createRelease () {
  // Create Release
  try {
    const createReleaseResponse = await octokit.rest.repos.createRelease({
      owner: owner,
      repo: repo,
      tag_name: 'v0.0',
      name: `test release ${Date.now()}`,
      body: 'test release',
      draft: true,
      prerelease: true
    })

    console.log(createReleaseResponse)
    return createReleaseResponse
  } catch
    (error) {
    core.setFailed(error.message)
  }
}

async function addZip (createReleaseResponse) {
  try {
    const filePath = 'latest.zip'
    const data = fs.readFileSync(filePath)

    // Determine content-length for header to upload asset
    const contentLength = filePath => fs.statSync(filePath).size

    const headers = { 'content-type': 'application/zip', 'content-length': contentLength }

    const uploadAssetResponse = await octokit.rest.repos.uploadReleaseAsset({
      url: createReleaseResponse.data.upload_url,
      headers,
      name: filePath,
      file: data
    })

    console.log(uploadAssetResponse)
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

  const releaseResponse = createRelease()
  shell.exec('git commit -am "release"')
  shell.exec('git archive -o latest.zip')
  const uploadResponse = addZip()

} catch
  (error) {
  core.setFailed(error.message)
}