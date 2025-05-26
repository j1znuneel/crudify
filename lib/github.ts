export type GitHubRepoTreeItem = {
  path: string;
  type: "blob" | "tree";
};

export async function getAccessTokenFromSupabase(supabase: any): Promise<string> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.provider_token;
  if (!token) throw new Error("No GitHub access token");
  return token;
}

export async function fetchRepoDefaultBranch(
  userName: string,
  repoName: string,
  accessToken: string
): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${userName}/${repoName}`, {
    headers: { Authorization: `token ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to get repo info");
  const data = await res.json();
  return data.default_branch;
}

export async function fetchRepoTreeRecursive(
  userName: string,
  repoName: string,
  branch: string,
  accessToken: string
): Promise<GitHubRepoTreeItem[]> {
  // Get branch info to get tree SHA
  const branchRes = await fetch(`https://api.github.com/repos/${userName}/${repoName}/branches/${branch}`, {
    headers: { Authorization: `token ${accessToken}` },
  });
  if (!branchRes.ok) throw new Error("Failed to get branch info");
  const branchData = await branchRes.json();

  const treeSha = branchData.commit.commit.tree.sha;

  const treeRes = await fetch(
    `https://api.github.com/repos/${userName}/${repoName}/git/trees/${treeSha}?recursive=1`,
    {
      headers: { Authorization: `token ${accessToken}` },
    }
  );

  if (!treeRes.ok) throw new Error("Failed to get repo tree");
  const treeData = await treeRes.json();

  return treeData.tree;
}

export function findModelsPyPaths(tree: GitHubRepoTreeItem[]): string[] {
  return tree.filter((item) => item.type === "blob" && item.path.endsWith("models.py")).map((item) => item.path);
}

export async function fetchFileContent(
  userName: string,
  repoName: string,
  filePath: string,
  accessToken: string
): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${userName}/${repoName}/contents/${filePath}`, {
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: "application/vnd.github.v3.raw",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch file content: ${filePath}`);
  return await res.text();
}
