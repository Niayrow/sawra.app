import Link from 'next/link';

const LOGO_SRC = '/icons/sansfond.webp';

const SIZE_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
} as const;

type SawraBrandMarkProps = {
  size?: keyof typeof SIZE_CLASS;
  showTagline?: boolean;
  className?: string;
  asLink?: boolean;
};

export function SawraBrandMark({
  size = 'md',
  showTagline = true,
  className = '',
  asLink = false,
}: SawraBrandMarkProps) {
  const content = (
    <>
      <img
        src={LOGO_SRC}
        alt=""
        width={size === 'lg' ? 56 : size === 'md' ? 44 : 32}
        height={size === 'lg' ? 56 : size === 'md' ? 44 : 32}
        loading="lazy"
        decoding="async"
        className={`${SIZE_CLASS[size]} shrink-0 object-contain drop-shadow-[0_4px_18px_rgba(191,160,120,0.35)]`}
        draggable={false}
        aria-hidden
      />
      {showTagline ? (
        <span className="flex min-w-0 flex-col items-start justify-center leading-none">
          <span className="reciter-name-gradient is-selected text-[1.02rem] font-black tracking-[-0.03em]">
            Sawra
          </span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#bfa078]/80">
            Coran
          </span>
        </span>
      ) : null}
    </>
  );

  const rootClass = `inline-flex items-center gap-2.5 ${className}`.trim();

  if (asLink) {
    return (
      <Link href="/" className={`${rootClass} tap-feedback rounded-xl transition-opacity hover:opacity-90`}>
        {content}
      </Link>
    );
  }

  return <span className={rootClass}>{content}</span>;
}
