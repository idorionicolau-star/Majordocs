import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 0.1,

    environment: process.env.NODE_ENV,

    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps

    beforeSend(event, hint) {
        // Don't send events in development
        if (process.env.NODE_ENV === 'development') {
            return null;
        }

        // Filter sensitive data
        if (event.request?.cookies) {
            delete event.request.cookies;
        }

        // Remove Firebase tokens from context
        if (event.contexts?.trace?.data) {
            delete event.contexts.trace.data.authorization;
        }

        return event;
    },
});
