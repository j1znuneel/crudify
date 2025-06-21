"use client";
import { Github, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LandingPage() {
  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "repo user",
      },
    });
  };
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">Crudify</h1>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
            Home
          </a>
          <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
            Features
          </a>
          <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">
            Pricing
          </a>
        </div>

        <Button
          className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg"
          onClick={signInWithGitHub}
        >
          <Github className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-6 py-20 max-w-4xl mx-auto text-center">
        {/* Launching Soon Badge */}
        <Badge
          variant="outline"
          className="mb-8 px-4 py-2 text-amber-600 border-amber-200 bg-amber-50 rounded-full font-medium"
        >
          Launching Soon ✨
        </Badge>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-5xl font-semibold text-gray-900 mb-6 leading-tight">
          Generate Full-Stack CRUD in <span className="block">Seconds.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-gray-600 mb-12 max-w-3xl leading-relaxed">
          Crudify.ai reads your Django models and instantly creates views,
          serializers, forms, and URLs — then commits and opens a pull request
          to your GitHub repo.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Button
            size="lg"
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-3 rounded-lg text-lg"
            onClick={signInWithGitHub}
          >
            Get Started
          </Button>

          <Link
            href="https://github.com/j1znuneel/crudify"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-8 py-3 rounded-lg text-lg"
            >
              <Star className="w-5 h-5 mr-2" />
              Star on GitHub
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
