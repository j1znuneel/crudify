"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAccessTokenFromSupabase,
  fetchRepoDefaultBranch,
  fetchRepoTreeRecursive,
  findModelsPyPaths,
  fetchFileContent,
  crudifyAndPush,
} from "@/lib/github";
import {
  generateSerializers,
  generateViews,
  generateUrls,
} from "@/lib/generator";
import { parseDjangoModels } from "@/lib/parser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Github,
  LogOut,
  GitBranch,
  Lock,
  Settings,
  Loader2,
  Code2,
  CheckCircle,
  FileText,
} from "lucide-react";

type GitHubRepo = {
  id: number;
  full_name: string;
};

type GitHubUser = {
  login: string;
  name: string;
  avatar_url: string;
};

type Props = {
  user: User;
};

export default function Dashboard({ user }: Props) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedFramework, setSelectedFramework] = useState("django");
  const [generatedCode, setGeneratedCode] = useState<{
    views: string;
    serializers: string;
    urls: string;
  } | null>(null);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);

  useEffect(() => {
    const fetchGitHubInfo = async () => {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.provider_token;

      if (!accessToken) return;

      // Fetch GitHub profile
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });

      if (userRes.ok) {
        const gitUser = await userRes.json();
        setGithubUser({
          login: gitUser.login,
          name: gitUser.name || gitUser.login,
          avatar_url: gitUser.avatar_url,
        });
      }

      // Fetch GitHub repos
      const reposRes = await fetch("https://api.github.com/user/repos", {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });
      const reposData: GitHubRepo[] = await reposRes.json();
      setRepos(reposData);
    };

    fetchGitHubInfo();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const crudify = async () => {
    if (!selectedRepo) return alert("Select a repo first!");
    if (selectedFramework !== "django")
      return alert("Currently, only Django is supported.");

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
      if (modelsPaths.length === 0) return alert("No models.py found in repo.");

      const modelsPyPath = modelsPaths[0];
      const modelDir = modelsPyPath.split("/").slice(0, -1).join("/");

      const modelsPyText = await fetchFileContent(
        userName,
        repoName,
        modelsPyPath,
        accessToken
      );

      const modelNames = parseDjangoModels(modelsPyText);
      if (modelNames.length === 0)
        return alert("No Django models found in models.py");

      const serializers = generateSerializers(modelNames);
      const views = generateViews(modelNames);
      const urls = generateUrls(modelNames);

      const code = { views, serializers, urls };
      setGeneratedCode(code);

        const prUrl = await crudifyAndPush({
          accessToken,
          owner: userName,
          repo: repoName,
          generatedCode: code,
          modelDir: modelDir,
        });

        alert("Pull Request created: " + prUrl);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Navbar */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <h1 className="font-semibold text-lg">CRUDIFY</h1>
        <div className="ml-auto flex items-center gap-3">
          {githubUser ? (
            <>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={githubUser.avatar_url || "/placeholder.svg"}
                    alt={githubUser.name}
                  />
                  <AvatarFallback>
                    {githubUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{githubUser.name}</p>
                  <p className="text-xs text-muted-foreground">
                    @{githubUser.login}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <Button disabled>
              <Github className="h-4 w-4 mr-2" />
              Loading...
            </Button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex flex-col gap-4 w-full max-w-7xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold">Your Repositories</h2>
        <div className="grid gap-6 grid-cols-2">
          <div className="flex justify-center flex-col">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Select Repository
                </CardTitle>
                <CardDescription>
                  Choose a repository to generate CRUD code for
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedRepo || ""}
                  onValueChange={setSelectedRepo}
                >
                  <div className="space-y-3 max-h-[300px] overflow-auto">
                    {repos.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No repos found or loading...
                      </p>
                    ) : (
                      repos.map((repo) => (
                        <div
                          key={repo.id}
                          className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50"
                        >
                          <RadioGroupItem
                            value={repo.full_name}
                            id={repo.full_name}
                          />
                          <Label
                            htmlFor={repo.full_name}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {repo.full_name}
                              </span>
                              {/* Optional private badge */}
                              {"private" in repo && (repo as any).private && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs flex items-center gap-1"
                                >
                                  <Lock className="w-3 h-3" />
                                  Private
                                </Badge>
                              )}
                            </div>
                            {(repo as any).description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {(repo as any).description}
                              </p>
                            )}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>
                Select framework and generate CRUD code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 ">
                <Label htmlFor="framework">Framework</Label>
                <Select
                  value={selectedFramework}
                  onValueChange={setSelectedFramework}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="django">
                      Django REST Framework
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={crudify}
                disabled={!selectedRepo || !selectedFramework}
                size="lg"
                className="w-full bg-amber-500 hover:bg-amber-600"
              >
                <Code2 className="h-4 w-4 mr-2" />
                CRUDIFY
              </Button>

              {generatedCode && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Code generated successfully!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {generatedCode && (
          <Card className="lg:col-span-2 mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generated Files
              </CardTitle>
              <CardDescription>
                Preview the generated CRUD code files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="serializers" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="serializers">serializers.py</TabsTrigger>
                  <TabsTrigger value="views">views.py</TabsTrigger>
                  <TabsTrigger value="urls">urls.py</TabsTrigger>
                </TabsList>

                <TabsContent value="serializers" className="mt-4">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                      <code>{generatedCode.serializers}</code>
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="views" className="mt-4">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                      <code>{generatedCode.views}</code>
                    </pre>
                  </div>
                </TabsContent>
                <TabsContent value="urls" className="mt-4">
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                      <code>{generatedCode.urls}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
