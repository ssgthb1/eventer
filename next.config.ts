import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google OAuth avatars
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Supabase storage avatars
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
