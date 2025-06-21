import { Octokit } from "octokit";

export type GitHubRepoTreeItem = {
  path: string;
  type: "blob" | "tree";
};

export async function getAccessTokenFromSupabase(
  supabase: any
): Promise<string> {
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
  const res = await fetch(
    `https://api.github.com/repos/${userName}/${repoName}`,
    {
      headers: { Authorization: `token ${accessToken}` },
    }
  );
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
  const branchRes = await fetch(
    `https://api.github.com/repos/${userName}/${repoName}/branches/${branch}`,
    {
      headers: { Authorization: `token ${accessToken}` },
    }
  );
  if (!branchRes.ok) throw new Error("Failed to get branch info");
  const branchData = await branchRes.json();
  console.log(branchData);

  const treeSha = branchData.commit.commit.tree.sha;
  console.log(treeSha);
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
  return tree
    .filter((item) => item.type === "blob" && item.path.endsWith("models.py"))
    .map((item) => item.path);
}

export async function fetchFileContent(
  userName: string,
  repoName: string,
  filePath: string,
  accessToken: string
): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${userName}/${repoName}/contents/${filePath}`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: "application/vnd.github.v3.raw",
      },
    }
  );
  if (!res.ok) throw new Error(`Failed to fetch file content: ${filePath}`);
  return await res.text();
}
export const crudifyAndPush = async ({
  accessToken,
  owner,
  repo,
  generatedCode,
}: {
  accessToken: string;
  owner: string;
  repo: string;
  generatedCode: { views: string; serializers: string; urls: string };
}) => {
  const headers = {
    Authorization: `token ${accessToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  const newBranchName = "crudify-generated";
  console.log(`Access token:${accessToken}`);
  console.log(`Owner:${owner}`);
  console.log(`Repo:${repo}`);
  console.log(`Code:${generatedCode}`);
  // Step 1: Get default branch and latest commit SHA
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;
  console.log("default branch:", defaultBranch);

  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`,
    { headers }
  );
  const refData = await refRes.json();
  const baseCommitSha = refData.object.sha;
  console.log("latest commit:", baseCommitSha);

  // Step 2: Get the tree SHA of the base commit
  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseCommitSha}`,
    { headers }
  );
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;
  console.log("base tree:", baseTreeSha);
  console.log(headers);

  const newBranch = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${newBranchName}`,
        sha: baseCommitSha,
      }),
    }
  );

  console.log("Create branch response status:", newBranch.status);
  const responseBody = await newBranch.json();
  console.log("Create branch response body:", responseBody);

  if (!newBranch.ok) {
    throw new Error(`Failed to create branch: ${JSON.stringify(responseBody)}`);
  }

  // Helper to create a blob
  const createBlob = async (content: string) => {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ content, encoding: "utf-8" }),
      }
    );
    const data = await res.json();
    return data.sha;
  };

  const viewsSha = await createBlob(generatedCode.views);
  const serializersSha = await createBlob(generatedCode.serializers);
  const urlsSha = await createBlob(generatedCode.urls);

  // Step 4: Create a new tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [
          {
            path: "views.py",
            mode: "100644",
            type: "blob",
            sha: viewsSha,
          },
          {
            path: "serializers.py",
            mode: "100644",
            type: "blob",
            sha: serializersSha,
          },
          {
            path: "urls.py",
            mode: "100644",
            type: "blob",
            sha: urlsSha,
          },
        ],
      }),
    }
  );
  const newTree = await treeRes.json();

  // Step 5: Create a commit
  const commitNewRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: "Add CRUD generated views, serializers, and urls",
        tree: newTree.sha,
        parents: [baseCommitSha],
      }),
    }
  );
  const newCommit = await commitNewRes.json();

  // Step 6: Update the new branch ref to point to the new commit
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${newBranchName}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ sha: newCommit.sha }),
    }
  );

  // Step 7: Create the pull request
  const prRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Add CRUD generated files",
        head: newBranchName,
        base: defaultBranch,
        body: "This PR adds views.py, serializers.py, and urls.py generated by Crudify.",
      }),
    }
  );

  const prData = await prRes.json();
  return prData.html_url; // ← Send this to frontend
};
