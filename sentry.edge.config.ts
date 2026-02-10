import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 0.1,

    environment: process.env.NODE_ENV,

    beforeSend(event, hint) {
        // Don't send events in development
        if (process.env.NODE_ENV === 'development') {
            return null;
        }

        return event;
    },
});
