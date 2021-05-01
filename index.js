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

    console.log("CREATE RELEASE RESPONSE:")
    console.log(createReleaseResponse)
    return createReleaseResponse
  } catch
    (error) {
    core.setFailed(error.message)
  }
}

async function uploadZip (releaseResponse) {
  try {
    console.log("STARTING UPLOAD ASSET")
    console.log(releaseResponse)
    const filePath = 'latest.zip'
    const fileData = fs.readFileSync(filePath)

    // Determine content-length for header to upload asset
    //const contentLength = filePath => fs.statSync(filePath).size

    //const headers = { 'content-type': 'application/zip', 'content-length': contentLength }
    console.log("ABOUT TO UPLOAD")
    const uploadAssetResponse = await octokit.rest.repos.uploadReleaseAsset({
      owner: owner,
      repo: repo,
      release_id: releaseResponse.data.id,
      name: filePath,
      data: fileData
    })

    console.log("UPLOAD ASSET RESPONSE")
    console.log(uploadAssetResponse)
  } catch
    (error) {
    core.setFailed(error.message)
  }
}

try {
  // Get the JSON webhook payload for the event that triggered the workflow
  //const payload = JSON.stringify(github.context.payload, undefined, 2)
  //console.log(`The event payload: ${payload}`)

  // Replace Data in Manifest
  const data = fs.readFileSync('system.json', 'utf8')
  const formatted = data.replace(/{{VERSION}}/g, '0.1')
  fs.writeFileSync('system.json', formatted, 'utf8')

  // Create Release
  const releaseResponse = createRelease()
  shell.exec('git config user.email "release@release.com"')
  shell.exec('git config user.name "Release"')
  shell.exec('git commit -am "release"')
  shell.exec('git archive -o latest.zip HEAD')
  const uploadResponse = uploadZip(releaseResponse)

} catch
  (error) {
  core.setFailed(error.message)
}