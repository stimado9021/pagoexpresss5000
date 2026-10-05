import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-mariadb', 'mariadb'],
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // Sin org/project no se suben sourcemaps (no requiere SENTRY_AUTH_TOKEN).
  // Solo activa el reporte de errores en runtime vía NEXT_PUBLIC_SENTRY_DSN.
  silent: true,
});
