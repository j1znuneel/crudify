"use client";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type GitHubRepo = {
  id: number;
  full_name: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);

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
    });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRepos([]);
  };

  return (
    <div className="flex justify-center items-center w-full h-[100vh]">
      {!user ? (
        <button
          onClick={signInWithGitHub}
          className="bg-green-600 px-4 py-2 rounded-md text-white shadow-[inset_0_-4px_4px_rgba(0,0,0,0.1)]
           transition-all duration-100 ease-in-out hover:bg-green-700"
        >
          Login with GitHub
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            onClick={signOut}
            className="bg-green-600 px-4 py-2 rounded-md text-white shadow-[inset_0_-4px_4px_rgba(0,0,0,0.1)]
           transition-all duration-100 ease-in-out hover:bg-green-700"
          >
            Logout
          </button>
          <h1 className="text-lg font-semibold mb-4">Your Repositories</h1>
          <RadioGroup
            defaultValue={repos[0]?.full_name}
            onValueChange={(val) => console.log("Selected repo:", val)}
          >
            {repos.map((repo) => (
              <div key={repo.id} className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value={repo.full_name} id={`repo-${repo.id}`} />
                <Label htmlFor={`repo-${repo.id}`}>{repo.full_name}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
