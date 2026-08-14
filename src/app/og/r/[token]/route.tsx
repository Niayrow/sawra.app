import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { decodeCustomRadio } from '@/utils/customRadio';
import {
  customRadioVoiceNames,
  decodeCustomRadioOgToken,
} from '@/utils/customRadioShare';
import { RECITER_IMAGES } from '@/utils/images';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ token: string }> };

async function loadFile(relPath: string): Promise<Buffer | null> {
  try {
    return await readFile(join(process.cwd(), 'public', relPath.replace(/^\//, '')));
  } catch {
    return null;
  }
}

async function loadPortrait(reciterId: number): Promise<Buffer | null> {
  const rel = RECITER_IMAGES[reciterId];
  if (!rel) return null;
  return (await loadFile(rel.replace(/\.webp$/i, '.png'))) || (await loadFile(rel));
}

function dataUri(buf: Buffer, mime = 'image/png'): string {
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function renderOgPng(tokenRaw: string): Promise<Buffer> {
  const token = decodeURIComponent(tokenRaw).replace(/\.png$/i, '');
  const config =
    decodeCustomRadioOgToken(token) ||
    decodeCustomRadio(token.replace(/!/g, '/')) ||
    null;

  const title = config?.name?.trim() || 'Radio Coran';
  const voiceCount = config?.reciterIds.length ?? 0;
  const surahCount = config?.surahIds.length ?? 0;
  const voiceNames = config ? customRadioVoiceNames(config, 3) : [];
  const titleSize = title.length > 22 ? 64 : title.length > 14 ? 76 : 88;

  const [logoBuf, plateBuf, ...portraitBufs] = await Promise.all([
    loadFile('/icons/sansfond.png'),
    loadFile('/reciters/background.png'),
    ...(config?.reciterIds.slice(0, 3).map((id) => loadPortrait(id)) ?? [Promise.resolve(null)]),
  ]);

  const logoSrc = logoBuf ? dataUri(logoBuf) : undefined;
  const plateSrc = plateBuf ? dataUri(plateBuf) : undefined;
  const portraits = portraitBufs
    .map((buf) => (buf ? dataUri(buf) : null))
    .filter((src): src is string => Boolean(src));
  const heroSrc = portraits[0];

  const image = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#050a12',
          color: '#f7f3ec',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Full-bleed hero portrait */}
        {heroSrc ? (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '58%',
              height: '100%',
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            {plateSrc ? (
              <img
                src={plateSrc}
                alt=""
                width={700}
                height={630}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : null}
            <img
              src={heroSrc}
              alt=""
              width={700}
              height={630}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top center',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at 70% 40%, #1a2a40 0%, #050a12 70%)',
              display: 'flex',
            }}
          />
        )}

        {/* Soft gold wash */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(115deg, #050a12 0%, #050a12 42%, rgba(5,10,18,0.55) 58%, rgba(5,10,18,0.18) 72%, rgba(5,10,18,0.55) 100%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 50% 80% at 78% 50%, rgba(191,160,120,0.14), transparent 60%)',
            display: 'flex',
          }}
        />

        {/* Waveform accent */}
        <div
          style={{
            position: 'absolute',
            left: 64,
            bottom: 58,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 5,
            height: 36,
            opacity: 0.55,
          }}
        >
          {[14, 24, 18, 32, 20, 28, 16, 34, 22, 12].map((h, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: h,
                borderRadius: 2,
                background: '#bfa078',
                display: 'flex',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '58%',
            height: '100%',
            padding: '52px 28px 52px 64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {logoSrc ? (
              <img
                src={logoSrc}
                width={56}
                height={56}
                alt=""
                style={{ objectFit: 'contain' }}
              />
            ) : null}
            <div
              style={{
                display: 'flex',
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: '#f0e6d8',
              }}
            >
              SAWRA
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
                color: '#fffaf3',
                maxWidth: 580,
              }}
            >
              {title}
            </div>

            <div
              style={{
                display: 'flex',
                fontSize: 26,
                fontWeight: 500,
                color: '#d4b896',
                letterSpacing: '0.02em',
              }}
            >
              {voiceCount > 0
                ? `${voiceCount} voix  ·  ${surahCount} sourates`
                : 'Radio Coran'}
            </div>

            {portraits.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {portraits.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      width={52}
                      height={52}
                      alt=""
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 999,
                        objectFit: 'cover',
                        objectPosition: 'top center',
                        border: '2px solid #0a121c',
                        marginLeft: i === 0 ? 0 : -14,
                      }}
                    />
                  ))}
                </div>
                {voiceNames.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 20,
                      color: '#b7c0cc',
                      maxWidth: 360,
                      lineHeight: 1.3,
                    }}
                  >
                    {voiceNames.join(' · ')}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: '#8fa0b2',
            }}
          >
            sawra.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );

  return Buffer.from(await image.arrayBuffer());
}

function pngHeaders(byteLength: number): HeadersInit {
  return {
    'Content-Type': 'image/png',
    'Content-Length': String(byteLength),
    'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const png = await renderOgPng(token);
  const body = new Uint8Array(png);
  return new Response(body, { headers: pngHeaders(body.byteLength) });
}

export async function HEAD(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const png = await renderOgPng(token);
  return new Response(null, { status: 200, headers: pngHeaders(png.byteLength) });
}
