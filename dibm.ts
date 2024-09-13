#!/usr/bin/env bun

import { messages } from './messages';
import {
  checkoutEnvBranch,
  createNewBranch,
  getFullUrl,
  getGithubRepoURL,
  getUserInput,
  installDependencies,
  mergeBranches,
  openPR,
  pushChanges,
  stashChanges,
  URLParams
} from './util';

export type InputType = {
  sourceBranch: string;
  envBranch: string;
  suffix: string;
  assignees: string;
  labels: string[];
  isBackMerge: boolean;
};

const USER_URL_PARAMS: URLParams = {
  assignees: 'immayurpanchal',
  labels: [':mag: Code Review', ':x: Do Not Merge']
};

const BACK_MERGE_DATE = `${new Date().getDate()}_${new Date().getMonth() + 1}_${new Date().getFullYear()}`;
const backMergeBranchName = `chore/backmerge_${BACK_MERGE_DATE}_{suffix}`;

const main = async () => {
  const {
    deployment: { SOURCE_BRANCH_PROMPT, ENV_BRANCH_PROMPT, SUFFIX }
  } = messages;

  const sourceBranch = await getUserInput(SOURCE_BRANCH_PROMPT);
  const envBranch = await getUserInput(ENV_BRANCH_PROMPT);
  const suffix = await getUserInput(SUFFIX);
  const NEW_BRANCH = backMergeBranchName.replace('{suffix}', suffix);

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
