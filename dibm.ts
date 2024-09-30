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
  USER_URL_PARAMS
} from './util';

export type InputType = {
  sourceBranch: string;
  envBranch: string;
  suffix: string;
  assignees: string;
  labels: string[];
  isBackMerge: boolean;
};

const BACK_MERGE_DATE = `${new Date().getDate()}_${new Date().getMonth() + 1}_${new Date().getFullYear()}`;
const backMergeBranchName = `chore/backmerge_${BACK_MERGE_DATE}_{suffix}`;

const main = async () => {
  const {
    deployment: { SUFFIX }
  } = messages;

  const sourceBranch = 'master';
  const envBranch = 'dev';
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
