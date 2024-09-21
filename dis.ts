#!/usr/bin/env bun

import { $ } from 'bun';
import { mergeBranches } from './util';

const dis = async () => {
  console.log('Executing BunJS script 🚜');
  const branchToSyncWith = process.argv[2];
  if (!branchToSyncWith) {
    console.log('Please Provide Branch Name');
    console.log('Example: dis master');
    process.exit(1);
  }

  await $`git pull`;
  await $`git checkout ${branchToSyncWith}`;
  await $`git pull origin ${branchToSyncWith}`;
  await $`git checkout -`;
  // get current branch where the script is being executed
  const currentBranch = await (await $`git branch --show-current`.text()).trim();
  mergeBranches(branchToSyncWith, currentBranch);
};

dis().catch(error => {
  console.error(error);
  process.exit(1);
});
