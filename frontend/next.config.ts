import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    reactStrictMode: true, // causes double render on component mount (dev)
    output: 'standalone',
}

export default nextConfig
