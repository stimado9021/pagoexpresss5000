import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/adapter-mariadb', 'mariadb'],
};

export default withSentryConfig(nextConfig, {
  // Sin org/project no se suben sourcemaps (no requiere SENTRY_AUTH_TOKEN).
  // Solo activa el reporte de errores en runtime vía NEXT_PUBLIC_SENTRY_DSN.
  silent: true,
});
