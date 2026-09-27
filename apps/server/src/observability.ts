import * as Sentry from "@sentry/node";

/**
 * GlitchTip (self-hosted, compatível com o protocolo do Sentry) já roda no infra-core.
 * Fica opt-in via SENTRY_DSN — sem a env var, isso é um no-op (dev local não precisa configurar nada).
 * DSN é gerado manualmente no GlitchTip (login -> Organization -> Project) e colado como env do serviço.
 */
export function initObservability() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, environment: process.env.NODE_ENV ?? "production" });
}

export { Sentry };
