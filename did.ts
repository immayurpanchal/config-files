#!/usr/bin/env bun
import { $ } from 'bun'

const getUserInput = async (prompt: string): Promise<string> => {
  process.stdout.write(prompt)
  return new Promise(resolve => {
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.once('data', function (data) {
      process.stdin.pause() // Automatically pause stdin after receiving input
      resolve(data.toString('utf8').trim())
    })
  })
}

const getGithubRepoURL = async () => {
  const repoPath = await $`git config --get remote.origin.url`.text()

  // Regular expression to match and capture the organization and repository names
  const regex = /^git@github\.com:(.+)\/(.+)\.git$/

  // Execute the regex and extract matches
  const matches = repoPath.trim().match(regex)

  let orgName, repoName

  if (matches) {
    orgName = matches[1]
    repoName = matches[2]
  }

  return {
    orgName: orgName,
    repoName: repoName
  }
}

const sourceBranch = await getUserInput('Enter Source Branch You want to deploy (i.e. feat/di-1234) : ')
const envBranch = await getUserInput('Enter Environment Branch (i.e. dev) : ')
const suffix = await getUserInput('Optional: Enter Suffix (i.e. feat/di-1234_dev_1) : ')
const NEW_BRANCH = `${sourceBranch}_${envBranch}_${suffix}`
const ASSIGNEES = 'immayurpanchal'
const LABELS = ':mag: Code Review, :x: Do Not Merge'
const URL_PARAMS = `expand=1&assignees=${ASSIGNEES}&labels=${LABELS}`

console.log('🗂 Stashing changes! Unstash manually after this step.')
await $`git add .`
await $`git stash`

console.log(`🚀 Checking out ${envBranch} and pulling latest changes.`)
await $`git checkout ${envBranch}`
await $`git pull origin ${envBranch}`

console.log(`🌟 Creating new branch: ${NEW_BRANCH}`)
await $`git checkout -b ${NEW_BRANCH}`

console.log(`🔄 Merging ${sourceBranch} into ${NEW_BRANCH}`)
const mergeResult = await $`git merge ${sourceBranch}`

if (mergeResult.exitCode !== 0) {
  console.log('⚠️ Merge conflicts detected. Resolve conflicts and commit manually.')

  // Wait for user to confirm that conflicts are resolved and committed
  let userInput
  do {
    userInput = await getUserInput('Have you resolved and committed the conflicts? (y/n): ')
  } while (!['y', 'Y', 'yes', 'Yes'].includes(userInput))
} else {
  console.log('✅ Merge successful.')
}

console.log('🔧 Running yarn install...')
await $`yarn install`

try {
  console.log(`🔼 Pushing changes...`)
  await $`git push`
  console.log('✅ Changes pushed.')
} catch (error) {
  console.log('❌ Push failed.')
}
const { orgName, repoName } = await getGithubRepoURL()
const fullUrl = `https://github.com/${orgName}/${repoName}/compare/${envBranch}...${NEW_BRANCH}?${URL_PARAMS}`

console.log('🎉 Done! Opening PR...')
await $`open ${fullUrl}`
