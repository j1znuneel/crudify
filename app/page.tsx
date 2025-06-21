"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { crudifyAndPush } from "@/lib/github";

import {
  getAccessTokenFromSupabase,
  fetchRepoDefaultBranch,
  fetchRepoTreeRecursive,
  findModelsPyPaths,
  fetchFileContent,
} from "@/lib/github";

import { parseDjangoModels } from "@/lib/parser";
import {
  generateSerializers,
  generateViews,
  generateUrls,
} from "@/lib/generator";
import LandingPage from "@/components/custom/hero";

type GitHubRepo = {
  id: number;
  full_name: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState("django");
  const [generatedCode, setGeneratedCode] = useState<{
    views: string;
    serializers: string;
    urls: string;
  } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.provider_token;

      if (accessToken) {
        const res = await fetch("https://api.github.com/user/repos", {
          headers: {
            Authorization: `token ${accessToken}`,
          },
        });
        const data: GitHubRepo[] = await res.json();
        setRepos(data);
      }
    };

    getUser();
  }, []);

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "repo user", 
      },
    });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRepos([]);
    setSelectedRepo(null);
    setGeneratedCode(null);
  };

  const crudify = async () => {
    if (!selectedRepo) {
      alert("Select a repo first!");
      return;
    }
    if (selectedFramework !== "django") {
      alert("Currently, only Django is supported.");
      return;
    }

    try {
      const accessToken = await getAccessTokenFromSupabase(supabase);

      const [userName, repoName] = selectedRepo.split("/");

      const defaultBranch = await fetchRepoDefaultBranch(
        userName,
        repoName,
        accessToken
      );

      const tree = await fetchRepoTreeRecursive(
        userName,
        repoName,
        defaultBranch,
        accessToken
      );

      const modelsPaths = findModelsPyPaths(tree);
      const modelsPyPath = modelsPaths[0];
      const modelDir = modelsPyPath.split("/").slice(0, -1).join("/"); 

      if (modelsPaths.length === 0) {
        alert("No models.py found in repo.");
        return;
      }

      // Take the first models.py found
      const modelsPyText = await fetchFileContent(
        userName,
        repoName,
        modelsPyPath,
        accessToken
      );

      const modelNames = parseDjangoModels(modelsPyText);

      if (modelNames.length === 0) {
        alert("No Django models found in models.py");
        return;
      }

      const serializers = generateSerializers(modelNames);
      const views = generateViews(modelNames);
      const urls = generateUrls(modelNames);

      const code = { views, serializers, urls };
      setGeneratedCode(code); // update state if you still want to show it somewhere later

      const prUrl = await crudifyAndPush({
        accessToken,
        owner: userName,
        repo: repoName,
        generatedCode: code, // use the local variable instead of state
        modelDir:modelDir
      });

      alert("Pull Request created: " + prUrl);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="flex justify-center items-center w-[100vw] h-[100vh] p-4">
      {!user ? (
        // <button
        //   onClick={signInWithGitHub}
        //   className="bg-green-600 px-4 py-2 rounded-md text-white shadow-[inset_0_-4px_4px_rgba(0,0,0,0.1)] transition-all duration-100 ease-in-out hover:bg-green-700"
        // >
        //   Login with GitHub
        // </button>
        <LandingPage/>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            onClick={signOut}
            className="bg-green-600 px-4 w-full py-2 rounded-md text-white shadow-[inset_0_-4px_4px_rgba(0,0,0,0.1)] transition-all duration-100 ease-in-out hover:bg-green-700 self-start"
          >
            Logout
          </button>

          <h1 className="text-lg font-semibold">Your Repositories</h1>
          <RadioGroup
            value={selectedRepo || ""}
            onValueChange={setSelectedRepo}
            aria-label="Select a repo"
            className="flex flex-col gap-2 max-h-[300px] overflow-auto"
          >
            {repos.length === 0 ? (
              <p>No repos found or loading...</p>
            ) : (
              repos.map((repo) => (
                <div key={repo.id} className="flex items-center gap-2">
                  <RadioGroupItem id={repo.full_name} value={repo.full_name} />
                  <Label htmlFor={repo.full_name}>{repo.full_name}</Label>
                </div>
              ))
            )}
          </RadioGroup>
          <div>
            <Label htmlFor="framework">Framework</Label>
            <select
              id="framework"
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              className="block w-full rounded-md border border-gray-300 p-2"
            >
              <option value="django">Django</option>
              {/* You can add other frameworks later */}
            </select>
          </div>

          <Button onClick={crudify}>CRUDIFY</Button>

          {generatedCode && (
            <div className="mt-6">
              <h2 className="font-bold text-xl">Generated Serializers.py</h2>
              <pre className="whitespace-pre-wrap bg-gray-900 p-4 rounded text-white max-h-96 overflow-auto">
                {generatedCode.serializers}
              </pre>

              <h2 className="font-bold text-xl mt-4">Generated Views.py</h2>
              <pre className="whitespace-pre-wrap bg-gray-900 p-4 rounded text-white max-h-96 overflow-auto">
                {generatedCode.views}
              </pre>

              <h2 className="font-bold text-xl mt-4">Generated Urls.py</h2>
              <pre className="whitespace-pre-wrap bg-gray-900 p-4 rounded text-white max-h-96 overflow-auto">
                {generatedCode.urls}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
