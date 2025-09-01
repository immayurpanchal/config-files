#!/usr/bin/env bun

import { $ } from "bun";
import process from "node:process";
import * as path from "node:path";
import { search, confirm, number, input } from "@inquirer/prompts";

/** ---------- Defaults (fixed; not from CLI) ---------- */
export const DEFAULT_ASSIGNEES = ["immayurpanchal"];
export const DEFAULT_REVIEWERS = ["kajal24mapare", "Sanket-Chandak", "Vaibhavnanne18", "prathameshkoshti", "sanket-mundada"];
export const DEFAULT_LABELS = ["🖥️ Code Review", "❌ Do Not Merge"];

/** ---------- Env / deps ---------- */
async function ensureInPath(bin: string) {
  const res = await (process.platform === "win32" ? $`where ${bin}` : $`which ${bin}`).nothrow();
  if (res.exitCode !== 0) throw new Error(`Required dependency not found: ${bin}`);
}

export async function ensureDepsAndRepo() {
  console.log("🔎 Checking dependencies & repo...");
  await ensureInPath("git");
  await ensureInPath("gh");
  const inside = await $`git rev-parse --is-inside-work-tree`.text();
  if (inside.trim() !== "true") throw new Error("Not a git repository. Run this inside a repo.");
  console.log("✅ Ready.\n");
}

/** ---------- Git helpers (local-only list) ---------- */
export function sanitizeLocalName(name: string): string {
  return name.replace(/^origin\//, "");
}

async function getLocalBranches(): Promise<string[]> {
  console.log("📋 Loading local branches (refs/heads only)...");
  const out = await $`git for-each-ref --format="%(refname:short)" refs/heads`.text();
  const list = out.split("\n").map((s) => s.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b));
  console.log(`➡️  Found ${list.length} local branches.`);
  return list;
}

export async function stashChanges(): Promise<string | null> {
  const status = (await $`git status --porcelain`.text()).trim();
  if (!status) {
    console.log("🗂 No local changes to stash.");
    return null;
  }
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const label = `did-auto-${ts}`;
  console.log(`🗂 Stashing changes as "${label}"...`);
  await $`git add .`;
  await $`git stash push -u -m ${label}`;
  console.log("✅ Changes stashed.");
  return label;
}

export async function updateBranchToLatest(name: string) {
  console.log(`\n🔁 Updating '${name}' to latest (ff-only)...`);
  await $`git checkout ${name}`;
  await $`git pull --ff-only`;
  console.log("✅ Up to date.");
}

export async function createTempBranchFromBase(base: string, newName: string) {
  console.log(`\n🌿 Creating temp branch '${newName}' from base '${base}'...`);
  await $`git checkout -B ${newName} ${base}`;
}

export async function mergeFeatureIntoTemp(from: string) {
  console.log(`\n🔀 Merging '${from}' into current branch...`);
  const res = await $`git merge --no-ff ${from}`.nothrow();
  if (res.exitCode === 0) {
    console.log("✅ Merge clean.");
    return;
  }
  console.warn("⚠️  Merge reported issues.");
  console.log("   Resolve conflicts, stage, and commit your fixes.");
  const proceed = await confirm({
    message: "Conflicts resolved and committed? Continue to push & create PR?",
    default: false,
  });
  if (!proceed) throw new Error("Stopped due to unresolved merge conflicts.");

  const unmerged = (await $`git ls-files --unmerged`.text()).trim();
  if (unmerged) throw new Error("Conflicts still present. Commit resolutions and re-run.");
  console.log("✅ Conflicts resolved by user.");
}

export async function pushBranch(name: string) {
  console.log(`\n⬆️  Pushing '${name}'...`);
  const out = await $`git push -u origin ${name}`.nothrow();
  if (out.exitCode !== 0) throw new Error(await out.text());
  console.log("✅ Pushed.");
}

/** ---------- PR scaffold (fixed rules; no CLI) ---------- */
function extractJiraId(branch: string): string | null {
  const m = branch.match(/(?:^|\/)((?:di|gs)-\d+)/i);
  return m ? m[1].toUpperCase() : null;
}
function envPrefix(base: string): string {
  const b = base.toLowerCase();
  if (b === "dev" || b.startsWith("dev/")) return "[DEV] ";
  if (b === "qa" || b.startsWith("qa/")) return "[QA] ";
  return "";
}
function humanizeBranch(branch: string): string {
  const type = (branch.match(/^(feat|fix|chore|refactor|perf|docs|test|build|ci)\b/i)?.[1] || "feat").toLowerCase();
  const afterSlash = branch.split("/")[1] ?? "";
  const scopeMaybe = afterSlash.match(/^[a-z0-9-]+/i)?.[0] ?? "";
  const scope = scopeMaybe && !/^(di|gs)-\d+$/i.test(scopeMaybe) ? `(${scopeMaybe.toLowerCase()})` : "";
  const rest = branch.replace(/[/_-]+/g, " ").replace(/\s+/g, " ").trim();
  return `${type}${scope ? scope : ""}: ${rest}`;
}

export function buildPrScaffold(originalSource: string, base: string, mainPrInfo?: { url: string; title: string } | null) {
  const jira = extractJiraId(originalSource);

  // Check if this is a DEV or QA branch for different template
  const baseNormalized = base.toLowerCase();
  const isDevOrQa = baseNormalized === "dev" || baseNormalized.startsWith("dev/") ||
                    baseNormalized === "qa" || baseNormalized.startsWith("qa/");
  const isMasterOrMain = baseNormalized === "master" || baseNormalized === "main";

  let title: string;
  const desc: string[] = [];

  if (isDevOrQa && mainPrInfo) {
    // Use main PR info for DEV/QA branches
    const envPrefixStr = envPrefix(base);
    title = `${envPrefixStr}${mainPrInfo.title}`.trim();
    desc.push("### Main PR:", "", `- ${mainPrInfo.url}`, "");
  } else if (isDevOrQa) {
    // DEV/QA without main PR info (fallback)
    title = `${envPrefix(base)}${jira ? `[${jira}] ` : ""}${humanizeBranch(originalSource)}`.trim();
    desc.push("### Main PR:", "", "- ", "");
  } else if (isMasterOrMain) {
    // Master/Main branches - auto-generate title without prefix, use default template
    title = `${jira ? `[${jira}] ` : ""}${humanizeBranch(originalSource)}`.trim();
    if (jira) desc.push("### JIRA ticket:", "", `- [${jira}](https://deepintent.atlassian.net/browse/${jira})`, "");
    desc.push(
      "### Scope of the PR:", "", "- ", "",
      "### Changes made in the PR:", "", "- ", "",
      "### Breaking changes introduced:", "", "- ", "",
      "### Dependent PRs:", "", "- ", "",
      "### Screenshots", "", ""
    );
  } else {
    // Other branches (fallback)
    title = `${envPrefix(base)}${jira ? `[${jira}] ` : ""}${humanizeBranch(originalSource)}`.trim();
    if (jira) desc.push("### JIRA ticket:", "", `- [${jira}](https://deepintent.atlassian.net/browse/${jira})`, "");
    desc.push(
      "### Scope of the PR:", "", "- ", "",
      "### Changes made in the PR:", "", "- ", "",
      "### Breaking changes introduced:", "", "- ", "",
      "### Dependent PRs:", "", "- ", "",
      "### Screenshots", "", ""
    );
  }

  return { title, body: desc.join("\n") };
}

/** ---------- PR via GH CLI (pure `$`) ---------- */
export async function createPrWithGh(opts: {
  head: string; base: string; title: string; body: string; labels: string[]; assignees: string[]; reviewers: string[];
}) {
  console.log("\n📣 Creating PR (gh)...");
  const tmpDir = await (process.platform === "win32"
    ? $`bash -lc "mktemp -d"`.text()
    : $`mktemp -d`.text()
  );
  const bodyPath = path.join(tmpDir.trim(), "BODY.md");
  await Bun.write(bodyPath, opts.body);

  // No CLI args from user; always use our defaults passed in.
  const res = await $`gh pr create --base ${opts.base} --head ${opts.head} --title ${opts.title} --body-file ${bodyPath} --label ${opts.labels.join(",")} --assignee ${opts.assignees.join(",")} --reviewer ${opts.reviewers.join(",")}`.nothrow();
  const out = await res.text();
  if (res.exitCode !== 0) throw new Error(out || "gh pr create failed");

  const urlMatch = out.match(/https?:\/\/\S+/);
  if (urlMatch) return urlMatch[0];

  const view = await $`gh pr view --json url --jq .url`.nothrow();
  const url = (await view.text()).trim();
  return url || "PR created (URL not detected).";
}

/** ---------- Compare URL opener (pure `$`) ---------- */
export async function getGithubRepoURL() {
  const repoPath = (await $`git config --get remote.origin.url`.text()).trim();

  let m = repoPath.match(/^git@github\.com:(.+)\/(.+)\.git$/);
  if (m) return { orgName: m[1], repoName: m[2] };

  m = repoPath.match(/^https:\/\/github\.com\/(.+)\/(.+)\.git$/);
  if (m) return { orgName: m[1], repoName: m[2] };

  return { orgName: "", repoName: "" };
}

export async function openUrl(url: string, description: string = "URL") {
  if (!url) {
    console.log(`❌ No ${description} to open`);
    return;
  }

  console.log(`\n🌐 Opening ${description}...`);
  try {
    if (process.platform === "darwin") {
      await $`open ${url}`.nothrow();
    } else if (process.platform === "win32") {
      await $`cmd /c start "" ${url}`.nothrow();
    } else {
      await $`xdg-open ${url}`.nothrow();
    }
    console.log(url);
  } catch (error) {
    console.log(`⚠️  Failed to open ${description} automatically`);
    console.log(`🔗 ${description}: ${url}`);
  }
}

/** ---------- Fuzzy search prompts (local-only) ---------- */
function fuzzyScore(text: string, query: string): number {
  if (!query) return 0;
  text = text.toLowerCase(); query = query.toLowerCase();
  let ti = 0, qi = 0, score = 0, streak = 0;
  while (ti < text.length && qi < query.length) {
    if (text[ti] === query[qi]) {
      streak += 1; score += 2 + Math.min(streak, 3);
      if (ti === 0) score += 5;
      if (text[ti - 1] === "/" || text[ti - 1] === "_" || text[ti - 1] === "-") score += 2;
      qi++;
    } else { streak = 0; }
    ti++;
  }
  return qi === query.length ? score : -1;
}

export async function pickLocalBranchWithSearch(
  message: string,
  preferredFirst: string[] = []
): Promise<string> {
  const branches = await getLocalBranches();
  const boosted = [
    ...preferredFirst.filter((b) => branches.includes(b)),
    ...branches.filter((b) => !preferredFirst.includes(b)),
  ];

  console.log(`🧭 ${message}`);
  const result = await search({
    message,
    choices: boosted.map((b) => ({ name: b, value: b })),
    source: async (input: string | undefined) => {
      const q = (input || "").trim();
      if (!q) return boosted.slice(0, 25).map((b) => ({ name: b, value: b }));
      const ranked = boosted
        .map((b) => ({ b, s: fuzzyScore(b, q) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 50)
        .map((x) => ({ name: x.b, value: x.b }));
      return ranked.length ? ranked : boosted.slice(0, 25).map((b) => ({ name: b, value: b }));
    },
  } as any);
  console.log(`➡️  Selected: ${String(result)}`);
  return String(result);
}

export async function promptSuffixNumber(message: string): Promise<string> {
  const val = await number({ message, min: 1, default: 1 });
  console.log(`➡️  Suffix: ${val}`);
  return String(val);
}

export async function promptMainPrId(message: string): Promise<string | null> {
  const val = await input({
    message,
    validate: (input: string) => {
      if (!input.trim()) return true; // Allow empty (optional)
      const num = parseInt(input.trim());
      return !isNaN(num) && num > 0 ? true : "Please enter a valid PR number or leave empty";
    }
  });
  const trimmed = val.trim();
  if (!trimmed) {
    console.log(`➡️  No main PR specified`);
    return null;
  }
  console.log(`➡️  Main PR ID: ${trimmed}`);
  return trimmed;
}

/** ---------- PR Info fetcher ---------- */
export async function getPrInfoById(prId: string): Promise<{ url: string; title: string; headRefName: string; baseRefName: string } | null> {
  try {
    console.log(`📋 Fetching PR info for #${prId}...`);
    const prInfo = await $`gh pr view ${prId} --json url,title,headRefName,baseRefName`.text();
    const parsed = JSON.parse(prInfo.trim());
    console.log(`✅ Found PR: ${parsed.title}`);
    return parsed;
  } catch (error) {
    console.log(`❌ No PR found with ID: ${prId}`);
    return null;
  }
}
