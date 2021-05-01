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

async function createRelease (versionNumber, gitLog) {
  try {
    return await octokit.rest.repos.createRelease({
      owner: owner,
      repo: repo,
      tag_name: `${versionNumber}`,
      name: `${versionNumber}`,
      body: `Release ${versionNumber}\n\n## Release Notes:\n${gitLog}`,
      draft: true,
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function uploadAssets (releaseResponse) {
  try {
    // Upload Zip
    const zipData = await fs.readFileSync(zipName)
    await octokit.rest.repos.uploadReleaseAsset({
      owner: owner,
      repo: repo,
      release_id: releaseResponse.data.id,
      name: zipName,
      data: zipData
    })

    // Upload Manifest
    const manifestData = await fs.readFileSync(manifestFileName, 'utf-8')
    await octokit.rest.repos.uploadReleaseAsset({
      owner: owner,
      repo: repo,
      release_id: releaseResponse.data.id,
      name: manifestFileName,
      data: manifestData
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function run () {
  try {
    // Validate manifestFileName
    if (manifestFileName !== 'system.json' && manifestFileName !== 'module.json')
      core.setFailed('manifestFileName must be system.json or module.json')

    // Get versionNumber from version.txt
    let versionNumber = await fs.readFileSync('version.txt', 'utf-8')
    versionNumber = `v${versionNumber.trim()}`

    // Replace Data in Manifest
    const data = fs.readFileSync(manifestFileName, 'utf8')
    const downloadURL = `https://github.com/${owner}/${repo}/releases/download/${versionNumber}/${repo}.zip`
    const manifestURL = `https://github.com/${owner}/${repo}/releases/download/${versionNumber}/system.json`
    const formatted = data
      .replace(/{{VERSION}}/g, versionNumber.replace('v', ''))
      .replace(/{{DOWNLOAD_URL}}/g, downloadURL)
      .replace(/{{MANIFEST_URL}}/g, manifestURL)
    fs.writeFileSync('system.json', formatted, 'utf8')

    // Create Release
    let gitLog = await shell.exec('git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"* %an - %s"')
    gitLog = gitLog.stdout
    const releaseResponse = await createRelease(versionNumber, gitLog)
    await shell.exec(`git config user.email "${committer_email}"`)
    await shell.exec(`git config user.name "${committer_username}"`)
    await shell.exec(`git commit -am "Release ${versionNumber}"`)
    await shell.exec(`git archive -o ${zipName} HEAD`)
    await uploadAssets(releaseResponse)

    // Log Results
    console.log(`**** Version ${versionNumber} Release Created!`)
    console.log('**** URLs Embedded in Manifest:')
    console.log(`** Download URL: ${downloadURL}`)
    console.log(`** Manifest URL: ${manifestURL}`)

  } catch (error) {
    core.setFailed(error.message)
  }
}

run()