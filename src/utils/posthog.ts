import posthog from 'posthog-js';
import { isDev, publicEnv } from '../lib/env';
import { getAppOptions } from './appOptions';

let initialized = false;

const ANALYTICS_OPT_OUT_KEY = 'sawra_analytics_opt_out';

export const isAnalyticsOptedOut = (): boolean => {
  try {
    if (getAppOptions().analyticsOptOut) return true;
    return localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
};

export const setPostHogOptOut = (optOut: boolean) => {
  try {
    localStorage.setItem(ANALYTICS_OPT_OUT_KEY, optOut ? '1' : '0');
  } catch {
    // ignore
  }
  if (!initialized) return;
  if (optOut) {
    posthog.opt_out_capturing();
  } else {
    posthog.opt_in_capturing();
  }
};

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

  const optedOut = isAnalyticsOptedOut();

  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    opt_out_capturing_by_default: optedOut,
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });

  initialized = true;

  if (optedOut) {
    posthog.opt_out_capturing();
  }
};

export const capturePostHogPageview = () => {
  if (!initialized || isAnalyticsOptedOut()) return;
  posthog.capture('$pageview', {
    $current_url: window.location.href,
  });
};

export const capturePostHogEvent = (
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) => {
  if (!initialized || isAnalyticsOptedOut()) return;
  posthog.capture(event, properties);
};

export const identifyPostHogUser = (
  userId: string,
  personProperties?: { email?: string; name?: string },
) => {
  if (!initialized || isAnalyticsOptedOut()) return;
  posthog.identify(userId, personProperties);
};

export const resetPostHogUser = () => {
  if (!initialized) return;
  posthog.reset();
};
