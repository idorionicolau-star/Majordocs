import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production (0.1 = 10% of requests)
    tracesSampleRate: 0.1,

    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps

    environment: process.env.NODE_ENV,

    // Filter out sensitive data
    beforeSend(event, hint) {
        // Don't send events in development
        if (process.env.NODE_ENV === 'development') {
            return null;
        }

        // Remove sensitive data from error context
        if (event.request?.cookies) {
            delete event.request.cookies;
        }

        return event;
    },

    // Ignore common errors that aren't actionable
    ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Random plugins/extensions
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        // Facebook errors
        'fb_xd_fragment',
        // Network errors
        'NetworkError',
        'Failed to fetch',
    ],
});
