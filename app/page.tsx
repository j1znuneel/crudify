"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import LandingPage from "@/components/custom/hero";
import Dashboard from "@/components/custom/dashboard";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return user ? (
    <Dashboard user={user} />
  ) : (
    <div className="flex justify-center items-center w-[100vw] h-[100vh] p-4">
      <LandingPage />
    </div>
  );
}
