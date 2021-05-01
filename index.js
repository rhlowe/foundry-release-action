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
const zipName = `${github.context.payload.repository.name}.zip`

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

    // Replace Data in Manifest
    const data = fs.readFileSync(manifestFileName, 'utf8')
    const formatted = data.replace(/{{VERSION}}/g, '0.1')
    fs.writeFileSync('system.json', formatted, 'utf8')

    // Create Release
    const releaseResponse = await createRelease()
    await shell.exec('git config user.email "release@release.com"')
    await shell.exec('git config user.name "Release"')
    await shell.exec('git commit -am "release"')
    await shell.exec(`git archive -o ${zipName} HEAD`)
    await uploadAssets(releaseResponse)

  } catch (error) {
    core.setFailed(error.message)
  }
}

run()