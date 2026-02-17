import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import * as tar from 'tar';

/**
 * Parse "owner/repo" string. Throws on invalid format.
 */
export function parseOwnerRepo(input) {
  const match = input.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (!match) {
    throw new Error(`Invalid repository format: "${input}". Expected "owner/repo".`);
  }
  return { owner: match[1], repo: match[2] };
}

/**
 * Get repo info and latest commit SHA from GitHub API.
 */
export async function getRepoInfo(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const res = await fetch(url, {
    headers: ghHeaders(),
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Repository not found: ${owner}/${repo}`);
    }
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Get latest commit SHA
  const branch = data.default_branch;
  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
    { headers: ghHeaders() },
  );

  let commit = '';
  if (refRes.ok) {
    const refData = await refRes.json();
    commit = refData.object?.sha?.slice(0, 7) || '';
  }

  return {
    fullName: data.full_name,
    description: data.description || '',
    defaultBranch: branch,
    commit,
    stars: data.stargazers_count,
  };
}

/**
 * Download and extract a repository tarball to a temporary directory.
 * Returns the path to the extracted directory.
 */
export async function downloadAndExtract(owner, repo, branch) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sklab-'));
  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${branch}`;

  const res = await fetch(tarballUrl, {
    headers: ghHeaders(),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Failed to download tarball: ${res.status} ${res.statusText}`);
  }

  const extractDir = path.join(tmpDir, 'repo');
  await fs.mkdir(extractDir, { recursive: true });

  // Save tarball to disk then extract (stream piping)
  const tarPath = path.join(tmpDir, 'repo.tar.gz');
  await pipeline(res.body, createWriteStream(tarPath));

  await tar.x({
    file: tarPath,
    cwd: extractDir,
    strip: 1,
  });

  return { extractDir, tmpDir };
}

/**
 * Search GitHub for repositories matching a query.
 */
export async function searchRepos(query, opts = {}) {
  let q = query;
  if (opts.repo) {
    q = `repo:${opts.repo} ${query}`;
  } else {
    q = `${query} topic:claude-skill`;
  }

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=20`;
  const res = await fetch(url, {
    headers: ghHeaders(),
  });

  if (!res.ok) {
    throw new Error(`GitHub search failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.items.map(item => ({
    fullName: item.full_name,
    description: item.description || '',
    stars: item.stargazers_count,
    updatedAt: item.updated_at,
  }));
}

/**
 * List skills available in a given GitHub repo by examining its contents.
 */
export async function listRepoSkills(owner, repo) {
  // Get the tree recursively
  const info = await getRepoInfo(owner, repo);
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${info.defaultBranch}?recursive=1`;
  const res = await fetch(url, { headers: ghHeaders() });

  if (!res.ok) {
    throw new Error(`Failed to list repo contents: ${res.status}`);
  }

  const data = await res.json();
  const skillPaths = data.tree
    .filter(item => item.path.endsWith('/SKILL.md') || item.path === 'SKILL.md')
    .map(item => item.path);

  return skillPaths;
}

function ghHeaders() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'sklab-cli',
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
