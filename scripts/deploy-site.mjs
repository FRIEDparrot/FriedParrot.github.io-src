import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const targetRepository = process.env.TARGET_REPOSITORY || 'FRIEDparrot/FriedParrot.github.io';
const targetBranch = process.env.TARGET_BRANCH || 'main';
const targetUrl = process.env.TARGET_REPOSITORY_URL || `https://github.com/${targetRepository}.git`;
const buildDir = path.resolve(rootDir, process.env.BUILD_DIR || 'docs/.vitepress/dist');
const publishDir = path.resolve(rootDir, process.env.PUBLISH_DIR || 'published-site');
const commitMessage = process.env.DEPLOY_COMMIT_MESSAGE || 'Deploy site';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: false,
    ...options
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }

  return result;
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    ...options
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function git(args, options = {}) {
  return run('git', ['-c', `safe.directory=${publishDir}`, ...args], options);
}

function gitCapture(args, options = {}) {
  return capture('git', ['-c', `safe.directory=${publishDir}`, ...args], options);
}

async function ensureBuildExists() {
  if (!existsSync(buildDir)) {
    throw new Error(`Build output not found: ${buildDir}. Run npm run docs:build first.`);
  }

  const buildStats = await stat(buildDir);
  if (!buildStats.isDirectory()) {
    throw new Error(`Build output is not a directory: ${buildDir}`);
  }
}

async function ensurePublishCheckout() {
  const gitDir = path.join(publishDir, '.git');

  if (!existsSync(publishDir)) {
    run('git', ['clone', '--branch', targetBranch, '--single-branch', targetUrl, publishDir]);
    return;
  }

  if (!existsSync(gitDir)) {
    throw new Error(`Publish directory exists but is not a git checkout: ${publishDir}`);
  }

  const remote = gitCapture(['-C', publishDir, 'remote', 'get-url', 'origin']);
  if (remote.status !== 0) {
    git(['-C', publishDir, 'remote', 'add', 'origin', targetUrl]);
  } else if (remote.stdout.trim() !== targetUrl) {
    git(['-C', publishDir, 'remote', 'set-url', 'origin', targetUrl]);
  }

  git(['-C', publishDir, 'fetch', 'origin', targetBranch]);

  const checkout = gitCapture(['-C', publishDir, 'checkout', targetBranch]);
  if (checkout.status !== 0) {
    git(['-C', publishDir, 'checkout', '-B', targetBranch, `origin/${targetBranch}`]);
  }

  git(['-C', publishDir, 'pull', '--ff-only', 'origin', targetBranch]);
}

async function replacePublishedFiles() {
  await mkdir(publishDir, { recursive: true });

  for (const entry of await readdir(publishDir, { withFileTypes: true })) {
    if (entry.name === '.git') {
      continue;
    }

    await rm(path.join(publishDir, entry.name), {
      recursive: true,
      force: true
    });
  }

  await cp(buildDir, publishDir, {
    recursive: true,
    force: true
  });
  await writeFile(path.join(publishDir, '.nojekyll'), '');
}

function configureCommitIdentity() {
  const name = process.env.GIT_COMMITTER_NAME || process.env.GIT_AUTHOR_NAME || 'github-actions[bot]';
  const email = process.env.GIT_COMMITTER_EMAIL || process.env.GIT_AUTHOR_EMAIL || 'github-actions[bot]@users.noreply.github.com';

  git(['-C', publishDir, 'config', 'user.name', name]);
  git(['-C', publishDir, 'config', 'user.email', email]);
}

function publishChanges() {
  git(['-C', publishDir, 'add', '-A']);

  const diff = gitCapture(['-C', publishDir, 'diff', '--cached', '--quiet']);
  if (diff.status === 0) {
    console.log('No site changes to publish.');
    return;
  }

  if (diff.status !== 1) {
    throw new Error('Unable to inspect staged deployment changes.');
  }

  git(['-C', publishDir, 'commit', '-m', commitMessage]);
  git(['-C', publishDir, 'push', 'origin', targetBranch]);
}

await ensureBuildExists();
await ensurePublishCheckout();
await replacePublishedFiles();
configureCommitIdentity();
publishChanges();
