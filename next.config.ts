import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["liquid-gooey", "vgpu"],
  async redirects() {
    return [
      {
        source: "/jukebox",
        destination: "/music?tab=jukebox",
        permanent: true,
      },
      {
        source: "/arcade/swell",
        destination: "/arcade/bitties",
        permanent: true,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.wgsl": {
        loaders: ["@vgpu/wgsl/loader-webpack"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.wgsl$/,
      type: "javascript/auto",
      use: ["@vgpu/wgsl/loader-webpack"],
    });
    return config;
  },
};

export default nextConfig;
