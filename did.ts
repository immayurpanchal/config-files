#!/usr/bin/env bun
import { $ } from 'bun';

const ENV_BRANCH_PROMPT = 'Enter Environment Branch (i.e. dev): ';
const SOURCE_BRANCH_PROMPT = 'Enter Source Branch You want to deploy (i.e. feat/di-1234): ';
const SUFFIX_PROMPT = 'Optional: Enter Suffix (i.e. feat/di-1234_dev_1): ';
const GITHUB_REPO_INFO_URL_QUERY_PARAMS = {
  expand: '1',
  assignees: 'immayurpanchal',
  labels: ':mag: Code Review, :x: Do Not Merge'
};

const GITHUB_REPO_INFO_URL_BASE = 'https://github.com/{orgName}/{repoName}/compare/{envBranch}...{newBranch}';

const GITHUB_REPO_INFO_URL =
  GITHUB_REPO_INFO_URL_BASE + '?' + new URLSearchParams(GITHUB_REPO_INFO_URL_QUERY_PARAMS).toString();

const promptUser = async (message: string): Promise<string> =>
  new Promise(resolve => {
    process.stdout.write(`${message} `);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', data => {
      process.stdin.pause();
      resolve(data.toString('utf8').trim());
    });
  });

const getGithubRepoInfo = async (): Promise<{ orgName: string; repoName: string }> => {
  const repoUrl = await $`git config --get remote.origin.url`.text();
  const regex = /^git@github\.com:(.+?)\/(.+?)\.git$/u;
  const match = repoUrl.trim().match(regex);

  if (!match) {
    throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
  }

  const [_, orgName, repoName] = match;

  return { orgName, repoName };
};

const getEnvironmentBranch = async (): Promise<string> => promptUser(ENV_BRANCH_PROMPT);
const getSourceBranch = async (): Promise<string> => promptUser(SOURCE_BRANCH_PROMPT);
const getSuffix = async (): Promise<string | undefined> => promptUser(SUFFIX_PROMPT);

const getGithubRepoInfoUrl = (orgName: string, repoName: string, envBranch: string, newBranch: string): string =>
  GITHUB_REPO_INFO_URL.replace('{orgName}', orgName)
    .replace('{repoName}', repoName)
    .replace('{envBranch}', envBranch)
    .replace('{newBranch}', newBranch);

const stashChanges = async () => {
  console.log('🗂 Stashing changes! Un-stash manually after this step.');
  await $`git add .`;
  await $`git stash`;
};

const checkoutAndPullLatest = async (branch: string) => {
  console.log(`🚀 Checking out ${branch} and pulling latest changes.`);
  await $`git checkout ${branch}`;
  await $`git pull origin ${branch}`;
};

const createNewBranch = async (sourceBranch: string, envBranch: string, suffix?: string): Promise<string> => {
  const newBranch = suffix ? `${sourceBranch}_${envBranch}_${suffix}` : `${sourceBranch}_${envBranch}`;
  await $`git checkout -b ${newBranch}`;

  return newBranch;
};

const mergeBranches = async (sourceBranch: string): Promise<void> => {
  const result = await $`git merge ${sourceBranch}`;

  if (result.exitCode !== 0) {
    console.log('⚠️ Merge conflicts detected. Resolve conflicts and commit manually.');

    // Wait for user to confirm that conflicts are resolved and committed
    let userInput;
    do {
      userInput = await promptUser('Have you resolved and committed the conflicts? (y/n): ');
    } while (!['y', 'Y', 'yes', 'Yes'].includes(userInput));
  } else {
    console.log('✅ Merge successful.');
  }
};

const runYarnInstall = async () => {
  console.log('🔧 Running yarn install...');
  await $`yarn install`;
};

const pushChanges = async () => {
  console.log('🔼 Pushing changes...');
  await $`git push`;
};

const main = async () => {
  const envBranch = await getEnvironmentBranch();
  const sourceBranch = await getSourceBranch();
  const suffix = await getSuffix();

  await stashChanges();

  await checkoutAndPullLatest(envBranch);

  const newBranch = await createNewBranch(sourceBranch, envBranch, suffix);

  await mergeBranches(sourceBranch);

  await runYarnInstall();

  try {
    await pushChanges();
    console.log('✅ Changes pushed.');
  } catch (error) {
    console.log('❌ Push failed.');
  }

  const { orgName, repoName } = await getGithubRepoInfo();
  const fullUrl = getGithubRepoInfoUrl(orgName, repoName, envBranch, newBranch);

  console.log('🎉 Done! Opening PR...');
  await $`open ${fullUrl}`;
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
