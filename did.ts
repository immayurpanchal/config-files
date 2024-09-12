#!/usr/bin/env bun
import { $ } from 'bun';

type URLParams = { assignees: string; labels: string[] };

const SOURCH_BRANCH_PROMPT = 'Enter Source Branch You want to deploy (i.e. feat/di-1234) : ';
const ENV_BRANCH_PROMPT = 'Enter Environment Branch (i.e. dev) : ';
const SUFFIX = 'Optional: Enter Suffix (i.e. feat/di-1234_dev_1) : ';
const USER_URL_PARAMS: URLParams = {
  assignees: 'immayurpanchal',
  labels: [':mag: Code Review', ':x: Do Not Merge']
};

const createURLParams = (urlParams: URLParams): string => {
  const { assignees, labels } = urlParams;
  const joinedLabels = labels.join(',');
  const params = new URLSearchParams({
    expand: '1',
    assignees,
    labels: joinedLabels
  });
  return `?${params.toString()}`;
};

const getUserInput = async (prompt: string): Promise<string> => {
  process.stdout.write(prompt);
  return new Promise(resolve => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', function (data) {
      process.stdin.pause(); // Automatically pause stdin after receiving input
      resolve(data.toString('utf8').trim());
    });
  });
};

const getGithubRepoURL = async () => {
  const repoPath = await $`git config --get remote.origin.url`.text();

  // Regular expression to match and capture the organization and repository names
  const regex = /^git@github\.com:(.+)\/(.+)\.git$/;

  // Execute the regex and extract matches
  const matches = repoPath.trim().match(regex);

  let orgName, repoName;

  if (matches) {
    orgName = matches[1];
    repoName = matches[2];
  }

  return {
    orgName: orgName || '',
    repoName: repoName || ''
  };
};

const stashChanges = async () => {
  console.log('🗂 Stashing changes! Un-stash manually at the end.');
  await $`git add .`;
  await $`git stash`;
  console.log('\n\n✅ Changes stashed.');
};

const checkoutEnvBranch = async (envBranch: string) => {
  console.log(`\n\n🚀 Checking out ${envBranch} and pulling latest changes.`);
  await $`git checkout ${envBranch}`;
  await $`git pull origin ${envBranch}`;
};

const createNewBranch = async (newBranch: string) => {
  console.log(`\n\n🌟 Creating new branch: ${newBranch}`);
  await $`git checkout -b ${newBranch}`;
};

const mergeBranches = async (sourceBranch: string, targetBranch: string) => {
  console.log(`\n\n🔄 Merging ${sourceBranch} into ${targetBranch}`);

  try {
    await $`git merge ${sourceBranch}`;
    console.log('\n\n✅ Merge successful.');
  } catch (error) {
    console.log('\n\n⚠️ Merge conflicts detected. Resolve conflicts and commit manually.');

    // Wait for user to confirm that conflicts are resolved and committed
    let userInput;
    do {
      userInput = await getUserInput('Have you resolved and committed the conflicts? (y/n): ');
    } while (!['y', 'Y', 'yes', 'Yes'].includes(userInput));
  }
};

const installDependencies = async () => {
  console.log('\n\n🔧 Running yarn install...');
  await $`yarn install`;
};

const pushChanges = async () => {
  try {
    console.log(`\n\n🔼 Pushing changes...`);
    await $`git push`;
    console.log('\n\n✅ Changes pushed.');
  } catch (error) {
    console.log('\n\n❌ Push failed.');
    console.error(error);
  }
};

const getFullUrl = async (
  orgName: string,
  repoName: string,
  envBranch: string,
  newBranch: string,
  urlParams: URLParams
) => {
  return `https://github.com/${orgName}/${repoName}/compare/${envBranch}...${newBranch}?${createURLParams(urlParams)}`;
};

const openPR = async (fullUrl: string) => {
  console.log('\n\n🎉 Done! Opening PR...');
  await $`open ${fullUrl}`;
  console.log(fullUrl);
};

const main = async () => {
  const sourceBranch = await getUserInput(SOURCH_BRANCH_PROMPT);
  const envBranch = await getUserInput(ENV_BRANCH_PROMPT);
  const suffix = await getUserInput(SUFFIX);
  const NEW_BRANCH = `${sourceBranch}_${envBranch}_${suffix}`;

  await stashChanges();
  await checkoutEnvBranch(envBranch);
  await createNewBranch(NEW_BRANCH);
  await mergeBranches(sourceBranch, NEW_BRANCH);
  await installDependencies();
  await pushChanges();

  const { orgName, repoName } = await getGithubRepoURL();
  const fullUrl = await getFullUrl(orgName, repoName, envBranch, NEW_BRANCH, USER_URL_PARAMS);
  await openPR(fullUrl);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
