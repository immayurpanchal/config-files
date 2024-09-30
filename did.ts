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

const main = async () => {
  const {
    deployment: { SOURCE_BRANCH_PROMPT, ENV_BRANCH_PROMPT, SUFFIX }
  } = messages;

  const sourceBranch = await getUserInput(SOURCE_BRANCH_PROMPT);
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
