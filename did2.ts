#!/usr/bin/env bun

import { messages } from "./messages";
import {
  ensureDepsAndRepo,
  pickLocalBranchWithSearch,
  promptSuffixNumber,
  promptMainPrId,
  getPrInfoById,
  sanitizeLocalName,
  stashChanges,
  updateBranchToLatest,
  createTempBranchFromBase,
  mergeFeatureIntoTemp,
  pushBranch,
  buildPrScaffold,
  createPrWithGh,
  openUrl,
  DEFAULT_ASSIGNEES,
  DEFAULT_REVIEWERS,
  DEFAULT_LABELS,
} from "./utils2";

const main = async () => {
  const {
    deployment: { SOURCE_BRANCH_PROMPT, ENV_BRANCH_PROMPT, SUFFIX, MAIN_PR_ID_PROMPT, PLAN_HEADING },
  } = messages;

  await ensureDepsAndRepo();

  // Inputs come ONLY from prompts
  const sourceBranchRaw = await pickLocalBranchWithSearch(SOURCE_BRANCH_PROMPT);
  const envBranchRaw = await pickLocalBranchWithSearch(ENV_BRANCH_PROMPT, ["dev", "qa", "master", "main"]);
  const suffix = await promptSuffixNumber(SUFFIX);

  // Check if this is DEV/QA deployment and ask for main PR ID
  const envBranch = sanitizeLocalName(envBranchRaw);
  const baseNormalized = envBranch.toLowerCase();
  const isDevOrQa = baseNormalized === "dev" || baseNormalized.startsWith("dev/") ||
                    baseNormalized === "qa" || baseNormalized.startsWith("qa/");
  const isMasterOrMain = baseNormalized === "master" || baseNormalized === "main";

  let mainPrInfo: { url: string; title: string } | null = null;
  if (isDevOrQa) {
    const mainPrId = await promptMainPrId(MAIN_PR_ID_PROMPT);
    if (mainPrId) {
      mainPrInfo = await getPrInfoById(mainPrId);
    }
  }

  const sourceBranch = sanitizeLocalName(sourceBranchRaw);
  // For master/main, use the source branch directly instead of creating a temp branch
  const NEW_BRANCH = isMasterOrMain ? sourceBranch : `${sourceBranch}_${envBranch.split("/").pop()!.toLowerCase()}_${suffix}`;

  const assignees = DEFAULT_ASSIGNEES;
  const reviewers = DEFAULT_REVIEWERS;
  const labels = DEFAULT_LABELS;

  console.log(`\n${PLAN_HEADING}`);
  console.log(`  • Source (feature):   ${sourceBranch}`);
  console.log(`  • Target (base):      ${envBranch}`);
  if (isMasterOrMain) {
    console.log(`  • Head branch:        ${NEW_BRANCH} (using source branch directly)`);
  } else {
    console.log(`  • Temp branch (head): ${NEW_BRANCH}`);
  }
  console.log(`  • Assignees:          ${assignees.join(", ")}`);
  console.log(`  • Reviewers:          ${reviewers.join(", ")}`);
  console.log(`  • Labels:             ${labels.join(", ")}`);
  if (mainPrInfo) {
    console.log(`  • Main PR:            ${mainPrInfo.title}`);
    console.log(`  • Main PR URL:        ${mainPrInfo.url}`);
  }
  console.log("");

  const stashLabel = await stashChanges();

  await updateBranchToLatest(sourceBranch);
  await updateBranchToLatest(envBranch);

  if (isMasterOrMain) {
    // For master/main, just push the source branch directly
    await pushBranch(sourceBranch);
  } else {
    // For dev/qa, create temp branch as before
    await createTempBranchFromBase(envBranch, NEW_BRANCH);
    await mergeFeatureIntoTemp(sourceBranch);
    await pushBranch(NEW_BRANCH);
  }

  const { title, body } = buildPrScaffold(sourceBranch, envBranch, mainPrInfo);
  const prUrl = await createPrWithGh({
    head: NEW_BRANCH,
    base: envBranch,
    title,
    body,
    labels,
    assignees,
    reviewers,
  });

  console.log(`\n✅ Pull request created: ${prUrl}`);

  await openUrl(prUrl, "PR");

  if (stashLabel) {
    console.log(`\nℹ️ Your local changes were stashed as "${stashLabel}".`);
    console.log(`   Restore: git stash list | git stash apply stash^{/${stashLabel}}`);
  }

  console.log("\n🎉 Done.\n");
};

main().catch((err) => {
  console.error("Error:", err?.message || err);
  process.exit(1);
});
