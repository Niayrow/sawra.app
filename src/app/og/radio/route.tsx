import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { decodeCustomRadio } from '@/utils/customRadio';
import { customRadioVoiceNames } from '@/utils/customRadioShare';
import { RECITER_IMAGES } from '@/utils/images';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('r') || searchParams.get('c') || searchParams.get('custom') || '';
  const config = token ? decodeCustomRadio(token) : null;

  const title = config?.name?.trim() || 'Radio Coran';
  const voiceCount = config?.reciterIds.length ?? 0;
  const surahCount = config?.surahIds.length ?? 0;
  const subtitle = config
    ? `${voiceCount} voix · ${surahCount} sourates`
    : 'Stations en continu · Gratuit';
  const voiceNames = config ? customRadioVoiceNames(config, 3) : [];
  const voiceLine =
    voiceNames.length > 0
      ? voiceNames.join(' · ') + (voiceCount > voiceNames.length ? '…' : '')
      : 'Sawra — Lecteur coranique';

  const [logoBuf, portraitBuf] = await Promise.all([
    readFile(join(process.cwd(), 'public/icons/sansfond.png')).catch(() => null),
    (async () => {
      const id = config?.reciterIds[0];
      if (!id) return null;
      const rel = RECITER_IMAGES[id];
      if (!rel) return null;
      // Prefer PNG for OG (webp less reliable in Satori)
      const pngCandidate = rel.replace(/\.webp$/i, '.png');
      try {
        return await readFile(join(process.cwd(), 'public', pngCandidate.replace(/^\//, '')));
      } catch {
        try {
          return await readFile(join(process.cwd(), 'public', rel.replace(/^\//, '')));
        } catch {
          return null;
        }
      }
    })(),
  ]);

  const logoSrc = logoBuf
    ? `data:image/png;base64,${logoBuf.toString('base64')}`
    : undefined;
  const portraitSrc = portraitBuf
    ? `data:image/png;base64,${portraitBuf.toString('base64')}`
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background: 'linear-gradient(145deg, #07111d 0%, #0f1c2e 48%, #1a2540 100%)',
          color: '#f6f8fb',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-80px',
            top: '-60px',
            width: '420px',
            height: '420px',
            borderRadius: '999px',
            background: 'rgba(191, 160, 120, 0.16)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '-120px',
            bottom: '-140px',
            width: '480px',
            height: '480px',
            borderRadius: '999px',
            background: 'rgba(58, 80, 128, 0.28)',
            display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', zIndex: 1 }}>
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} width={72} height={72} alt="" style={{ objectFit: 'contain' }} />
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#e6d5c2',
              }}
            >
              SAWRA
            </div>
            <div style={{ fontSize: 20, color: '#95a7ba', fontWeight: 600 }}>Radio Coran</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '40px', zIndex: 1, flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#bfa078',
              }}
            >
              Radio personnalisée
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: title.length > 28 ? 52 : 64,
                fontWeight: 900,
                lineHeight: 1.08,
                letterSpacing: '-0.02em',
                maxWidth: '720px',
              }}
            >
              {title}
            </div>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#e2d0ba' }}>
              {subtitle}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#aab7c5', maxWidth: '680px' }}>
              {voiceLine}
            </div>
          </div>

          {portraitSrc ? (
            <div
              style={{
                display: 'flex',
                width: 220,
                height: 220,
                borderRadius: 36,
                overflow: 'hidden',
                border: '3px solid rgba(191, 160, 120, 0.45)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portraitSrc}
                width={220}
                height={220}
                alt=""
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
              />
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', fontSize: 22, color: '#8ea1b3', fontWeight: 600 }}>
            Gratuit · Sans publicité · sawra.app
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 22px',
              borderRadius: 999,
              background: 'rgba(226, 208, 186, 0.14)',
              border: '1px solid rgba(191, 160, 120, 0.35)',
              color: '#e6d5c2',
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            Écouter
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
