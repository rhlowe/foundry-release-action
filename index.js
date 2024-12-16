// noinspection JSUnresolvedFunction,JSIgnoredPromiseFromCall

const cache = require('@actions/cache')
const core = require('@actions/core')
const exec = require('@actions/exec')
const fs = require('fs')
const github = require('@actions/github')
const shell = require('shelljs')

const actionToken = core.getInput('actionToken')
const manifestFileName = core.getInput('manifestFileName')
const manifestProtectedTrue = core.getInput('manifestProtectedTrue')
const octokit = github.getOctokit(actionToken)
const owner = github.context.payload.repository.owner.login
const repo = github.context.payload.repository.name
const committer_email = github.context.payload.head_commit.committer.email
const committer_username = github.context.payload.head_commit.committer.username
const zipName = `${github.context.payload.repository.name}.zip`

async function compilePacks () {
  try {
    // Load and parse module.json
    const data = fs.readFileSync(manifestFileName, 'utf-8')
    const manifestJson = JSON.parse(data)

    // Get the packs from the module
    const packs = manifestJson.packs || []

    // Process each pack
    for (const pack of packs) {
      const packName = pack.name
      if (packName) {
        // Compile the JSON file to LevelDB
        await compilePack(`packs/${packName}/src`, `packs/${packName}`)
      }
    }
  } catch (err) {
    console.error('Error processing packs:', err)
  }
}

async function createRelease (versionNumber, commitLog) {
  try {
    return await octokit.rest.repos.createRelease({
      owner: owner,
      repo: repo,
      tag_name: `${versionNumber}`,
      name: `${versionNumber}`,
      body: `Release ${versionNumber}\n\n## Release Notes:\n${commitLog}`,
      draft: true,
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function getCommitLog () {
  try {
    // Get The Latest Release
    console.log(`Get Latest Release for ${owner}/${repo}`)
    const latestRelease = await octokit.rest.repos.getLatestRelease({
      owner: owner,
      repo: repo,
    })

    // Get Commits Since That Release's Date
    console.log(`Get Latest Commits for ${owner}/${repo}`)
    const commitList = await octokit.rest.repos.listCommits({
      owner: owner,
      per_page: 100,
      repo: repo,
      sha: 'main',
      since: latestRelease.data.created_at,
    })
    let commitListMarkdown = ''
    commitList.data
            .filter(
                    (commit) =>
                            !commit.commit.author.name.includes('bot') &&
                            !commit.commit.message.includes('version.txt')
            )
            .forEach((commit) => {
              commitListMarkdown += `* ${commit.commit.message} (${commit.commit.author.name})\n`
            })

    return commitListMarkdown
  } catch (error) {
    console.log(error)
    core.setFailed(error.message)
  }
}

async function installNodeModules () {
  try {
    const packageLockFile = 'package-lock.json'
    // Check if package-lock.json exists
    if (!fs.existsSync(packageLockFile)) {
      core.setFailed(`File not found: ${packageLockFile}`)
      return
    }

    // Compute SHA256 hash of package-lock.json
    const fileContent = fs.readFileSync(packageLockFile, 'utf-8')
    const hash = crypto.createHash('sha256').update(fileContent).digest('hex')
    const cacheKey = `node-modules-${hash}`
    const cachePath = 'node_modules'

    // Attempt to restore cache
    const cacheHit = await cache.restoreCache([cachePath], cacheKey)
    if (cacheHit) {
      core.info(`Cache hit for key: ${cacheHit}`)
    } else {
      core.info(`No cache found, installing dependencies...`)
    }

    // Install dependencies if cache is not found
    if (!cacheHit) {
      await exec.exec('npm ci --production')
      await cache.saveCache([cachePath], cacheKey)
    }

    core.setOutput('success', 'true')
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

    // Install Node Modules
    console.log('Install Node Modules')
    await installNodeModules()

    // Get versionNumber from version.txt
    let versionNumber = await fs.readFileSync('version.txt', 'utf-8')
    versionNumber = `v${versionNumber.trim()}`

    // Set up Download URLs
    let downloadURL = `https://github.com/${owner}/${repo}/releases/download/${versionNumber}/${repo}.zip`
    let manifestURL = `https://github.com/${owner}/${repo}/releases/download/${versionNumber}/${manifestFileName}`
    let manifestProtectedValue = 'false'
    if (manifestProtectedTrue === 'true') {
      downloadURL = ''
      manifestURL = `https://raw.githubusercontent.com/${owner}/dcc-content/main/${repo}/${versionNumber}/${manifestFileName}`
      manifestProtectedValue = 'true'
    }

    // Replace Data in Manifest
    fs.readdirSync('.').forEach(file => {
      console.log(file)
    })
    const data = fs.readFileSync(manifestFileName, 'utf8')

    const formatted = data
            .replace(/'version': .*,/i, `'version': '${versionNumber.replace('v', '')}',`)
            .replace(/'download': .*,/i, `'download': '${downloadURL}',`)
            .replace(/'manifest': .*,/i, `'manifest': '${manifestURL}',`)
            .replace(/'protected': .*,/i, `'protected': ${manifestProtectedValue},`)
    fs.writeFileSync(manifestFileName, formatted, 'utf8')

    // Create Foundry LevelDB Files from JSON
    console.log('Compiling packs...')
    await compilePacks()

    // Git List of Commits Since Last Release
    console.log('Get Commit Log')
    const commitLog = await getCommitLog()

    // Create Release
    console.log('Create Release')
    const releaseResponse = await createRelease(versionNumber, commitLog)
    await shell.exec(`git config user.email '${committer_email}'`)
    await shell.exec(`git config user.name '${committer_username}'`)
    await shell.exec(`git commit -am 'Release ${versionNumber}'`)
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
