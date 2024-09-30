#!/usr/bin/env bun

import { $, argv } from 'bun';
import { getFullUrl, getGithubRepoURL, openPR, USER_URL_PARAMS } from './util';

const main = async () => {
  const envBranch = argv[2];

  if (!envBranch) {
    throw Error('🙏🏼 Please provide a branch to raise the PR against (e.g. master)');
  }
  const NEW_BRANCH = (await $`git branch --show-current`.text()).trim();
  const { orgName, repoName } = await getGithubRepoURL();
  const fullUrl = await getFullUrl(orgName, repoName, envBranch, NEW_BRANCH, USER_URL_PARAMS);
  await openPR(fullUrl);
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
