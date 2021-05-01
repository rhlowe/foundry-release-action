// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall

const core = require('@actions/core')
const github = require('@actions/github')
const shell = require('shelljs')
const fs = require('fs')

const manifestFileName = core.getInput('manifestFileName')
const actionToken = core.getInput('actionToken')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name
const committer_email = github.context.payload.head_commit.committer.email
const committer_username = github.context.payload.head_commit.committer.username
const zipName = `${github.context.payload.repository.name}.zip`

async function createRelease (versionNumber) {
  // Create Release
  try {
    const createReleaseResponse = await octokit.rest.repos.createRelease({
      owner: owner,
      repo: repo,
      tag_name: `v${versionNumber}`,
      name: `v${versionNumber} ${Date.now()}`,
      body: `Release v${versionNumber}`,
      draft: true,
    })

    console.log('CREATE RELEASE RESPONSE:')
    console.log(createReleaseResponse)
    return createReleaseResponse
  } catch
    (error) {
    core.setFailed(error.message)
  }
}

async function uploadAssets (releaseResponse) {
  try {
    console.log('STARTING UPLOAD ASSET')

    const zipData = await fs.readFileSync(zipName)
    await octokit.rest.repos.uploadReleaseAsset({
      owner: owner,
      repo: repo,
      release_id: releaseResponse.data.id,
      name: zipName,
      data: zipData
    })

    const manifestData = await fs.readFileSync(manifestFileName, 'utf-8')
    const uploadManifestResponse = await octokit.rest.repos.uploadReleaseAsset({
      owner: owner,
      repo: repo,
      release_id: releaseResponse.data.id,
      name: manifestFileName,
      data: manifestData
    })

    console.log('UPLOAD ASSET RESPONSE')
    console.log(uploadManifestResponse)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run () {
  try {
    // Validate manifestFileName
    if (manifestFileName !== 'system.json' && manifestFileName !== 'module.json')
      core.setFailed('manifestFileName must be system.json or module.json')

    const versionNumber = await fs.readFileSync('version.txt')

    // Replace Data in Manifest
    const data = fs.readFileSync(manifestFileName, 'utf8')
    const downloadURL = `https://github.com/${owner}/${repo}/releases/download/${versionNumber}/${repo}.zip`
    const manifestURL = `https://github.com/${owner}/${repo}/releases/download/${versionNumber}/system.json`
    const formatted = data
      .replace(/{{VERSION}}/g, versionNumber)
      .replace(/{{DOWNLOAD_URL}}/g, downloadURL)
      .replace(/{{MANIFEST_URL}}/g, manifestURL)
    fs.writeFileSync('system.json', formatted, 'utf8')

    // Create Release
    const releaseResponse = await createRelease(versionNumber)
    await shell.exec(`git config user.email "${committer_email}"`)
    await shell.exec(`git config user.name "${committer_username}"`)
    await shell.exec(`git commit -am "Release ${versionNumber}"`)
    await shell.exec(`git archive -o ${zipName} HEAD`)
    await uploadAssets(releaseResponse)

  } catch (error) {
    core.setFailed(error.message)
  }
}

run()