"use client"
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

type GitHubRepo = {
  id: number
  full_name: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [repos, setRepos] = useState<GitHubRepo[]>([])

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)

      const session = await supabase.auth.getSession()
      const accessToken = session.data.session?.provider_token

      if (accessToken) {
        const res = await fetch('https://api.github.com/user/repos', {
          headers: {
            Authorization: `token ${accessToken}`,
          },
        })
        const data: GitHubRepo[] = await res.json()
        setRepos(data)
      }
    }

    getUser()
  }, [])

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
    })
  }

  return (
    <div style={{ padding: 20 }}>
      {!user ? (
        <button onClick={signInWithGitHub}>Login with GitHub</button>
      ) : (
        <div>
          <h1>Your Repositories</h1>
          <ul>
            {repos.map((repo) => (
              <li key={repo.id}>{repo.full_name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
