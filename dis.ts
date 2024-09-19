#!/usr/bin/env bun

import { $ } from 'bun';

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
  await $`git merge ${branchToSyncWith}`;
};

dis().catch(error => {
  console.error(error);
  process.exit(1);
});
