import posthog from 'posthog-js';
import { isDev, publicEnv } from '../lib/env';

let initialized = false;

export const initPostHog = () => {
  const key = publicEnv.posthogKey;
  const host = publicEnv.posthogHost;

  if (!key || !host) {
    if (isDev) {
      const variable = !key ? 'NEXT_PUBLIC_POSTHOG_KEY' : 'NEXT_PUBLIC_POSTHOG_HOST';
      throw new Error(
        `${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variable} is configured`,
      );
    }
    return;
  }

  if (initialized) return;

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });

  initialized = true;
};

export const capturePostHogPageview = () => {
  if (!initialized) return;
  posthog.capture('$pageview', {
    $current_url: window.location.href,
  });
};

export const capturePostHogEvent = (
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) => {
  if (!initialized) return;
  posthog.capture(event, properties);
};

export const identifyPostHogUser = (
  userId: string,
  personProperties?: { email?: string; name?: string },
) => {
  if (!initialized) return;
  posthog.identify(userId, personProperties);
};

export const resetPostHogUser = () => {
  if (!initialized) return;
  posthog.reset();
};

