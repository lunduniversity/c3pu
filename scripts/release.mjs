#!/usr/bin/env node
// Interactive release cutter: bumps package.json's version, commits, tags
// (vX.Y.Z), and pushes. The `release` GitHub Actions workflow does the rest
// (build, test, publish a GitHub Release with an attached build) once it
// sees the pushed tag. See README.md's "Releasing a new version" section.

import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'

function run(cmd, args) {
  return spawnSync(cmd, args, { encoding: 'utf8' })
}

function git(args, { allowFailure = false } = {}) {
  const result = run('git', args)
  if (result.status !== 0) {
    if (allowFailure) return ''
    throw new Error(`git ${args.join(' ')} failed:\n${result.stderr}`)
  }
  return result.stdout.trim()
}

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}

function parseOwnerRepo(remoteUrl) {
  // Handles both https://github.com/owner/repo.git and
  // git@<any-host-alias>:owner/repo.git (SSH config aliases included).
  const match = remoteUrl.match(/[:/]([^/:]+)\/([^/]+?)(\.git)?$/)
  return match ? { owner: match[1], repo: match[2] } : null
}

function bump(version, type) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) throw new Error(`Not a plain major.minor.patch version: ${version}`)
  const [major, minor, patch] = match.slice(1).map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

async function main() {
  const status = git(['status', '--porcelain'])
  if (status) fail('Working tree is not clean. Commit or stash your changes before releasing.')

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch !== 'main') fail(`Releases are made from "main", but the current branch is "${branch}".`)

  console.log('Fetching latest from origin...')
  git(['fetch', 'origin', '--tags', '--quiet'])

  const head = git(['rev-parse', 'HEAD'])
  const remoteMain = git(['rev-parse', 'origin/main'], { allowFailure: true })
  if (remoteMain && head !== remoteMain) {
    const mergeBase = git(['merge-base', 'HEAD', 'origin/main'])
    if (mergeBase === head) {
      fail('Local main is behind origin/main. Pull the latest changes before releasing.')
    } else if (mergeBase !== remoteMain) {
      fail('Local main has diverged from origin/main. Resolve that before releasing.')
    } else {
      const ahead = git(['rev-list', '--count', 'origin/main..HEAD'])
      console.log(`Note: ${ahead} local commit(s) not yet on origin/main will be pushed with this release.`)
    }
  }

  const ownerRepo = parseOwnerRepo(git(['remote', 'get-url', 'origin']))

  const latestTag = git(['tag', '-l', 'v*.*.*', '--sort=-v:refname']).split('\n')[0] || ''
  const currentVersion = latestTag ? latestTag.replace(/^v/, '') : '0.0.0'
  if (latestTag) {
    const tagDate = git(['for-each-ref', `refs/tags/${latestTag}`, '--format=%(creatordate:iso)'])
    console.log(`\nCurrent latest release: ${latestTag} (released ${tagDate})`)
  } else {
    console.log('\nNo releases yet.')
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let type
  while (!type) {
    const answer = (
      await rl.question('\nWhat kind of release is this?\n  1) patch\n  2) minor\n  3) major\n  4) cancel\n> ')
    )
      .trim()
      .toLowerCase()
    if (answer === '1' || answer === 'patch') type = 'patch'
    else if (answer === '2' || answer === 'minor') type = 'minor'
    else if (answer === '3' || answer === 'major') type = 'major'
    else if (answer === '4' || answer === 'cancel' || answer === '') {
      console.log('Cancelled.')
      rl.close()
      return
    } else {
      console.log('Please enter 1, 2, 3, or 4.')
    }
  }

  const nextVersion = bump(currentVersion, type)
  const confirmation = (await rl.question(`\nThis will release v${currentVersion} -> v${nextVersion} (${type}). Proceed? [y/N] `))
    .trim()
    .toLowerCase()
  rl.close()
  if (confirmation !== 'y' && confirmation !== 'yes') {
    console.log('Cancelled.')
    return
  }

  console.log(`\nBumping version to ${nextVersion}...`)
  const npmVersion = run('npm', ['version', type, '--no-git-tag-version'])
  if (npmVersion.status !== 0) fail(`npm version failed:\n${npmVersion.stderr}`)
  const bumped = npmVersion.stdout.trim().replace(/^v/, '')
  // npm's own semver bump is authoritative; this just guards against our
  // simpler bump() above silently drifting from npm's behavior.
  if (bumped !== nextVersion) {
    fail(`Internal error: expected npm to bump to ${nextVersion}, but it bumped to ${bumped}.`)
  }

  const tag = `v${nextVersion}`
  git(['add', 'package.json', 'package-lock.json'])
  git(['commit', '-m', `Release ${tag}`])
  git(['tag', '-a', tag, '-m', tag])

  console.log(`\nPushing ${branch} and ${tag} to origin...`)
  const push = run('git', ['push', 'origin', branch, '--follow-tags'])
  if (push.status !== 0) {
    fail(
      `Commit and tag ${tag} were created locally, but pushing failed:\n${push.stderr}\n` +
        `Fix the issue and run: git push origin ${branch} --follow-tags`,
    )
  }

  console.log(`\nReleased ${tag}.`)
  if (ownerRepo) {
    const { owner, repo } = ownerRepo
    console.log(`Build progress:   https://github.com/${owner}/${repo}/actions`)
    console.log(`Release page:     https://github.com/${owner}/${repo}/releases/tag/${tag}`)
    console.log(`Static "latest":  https://github.com/${owner}/${repo}/releases/latest/download/c3pu.html`)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
