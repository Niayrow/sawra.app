import { NextRequest, NextResponse } from 'next/server';
import { decodeCustomRadio } from '@/utils/customRadio';
import { encodeCustomRadioOgToken } from '@/utils/customRadioShare';

export const runtime = 'nodejs';

/**
 * Legacy query-string OG URLs → path-based token (Twitter-friendly).
 * /og/radio?r=86.20.31/78-114/x → /og/r/<base64url>
 */
export async function GET(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get('r') ||
    request.nextUrl.searchParams.get('c') ||
    request.nextUrl.searchParams.get('custom') ||
    '';
  const config = token ? decodeCustomRadio(token.replace(/!/g, '/')) : null;
  if (!config) {
    return NextResponse.redirect(new URL('/og-image.png', request.url), 302);
  }
  const pathToken = encodeCustomRadioOgToken(config);
  return NextResponse.redirect(new URL(`/og/r/${pathToken}`, request.url), 302);
}
