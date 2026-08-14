import React from 'react';

type AyahProgressIndicatorProps = {
  available: boolean;
  activeAyah: number | null;
  totalAyahs: number;
  ayahProgress: number | null;
  onOpenPicker?: () => void;
  accentColor?: string;
  className?: string;
};

export const AyahProgressIndicator: React.FC<AyahProgressIndicatorProps> = ({
  available,
  activeAyah,
  totalAyahs,
  ayahProgress,
  onOpenPicker,
  accentColor = '#bfa078',
  className = '',
}) => {
  if (!available || activeAyah == null || totalAyahs <= 0) return null;

  const label = `Verset ${activeAyah} / ${totalAyahs}`;
  const progressPct =
    ayahProgress != null ? Math.round(ayahProgress * 100) : 0;

  const content = (
    <>
      <span className="truncate font-semibold tabular-nums">{label}</span>
      {onOpenPicker && (
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#7a8fa3] group-hover:text-[#bfa078]">
          Changer
        </span>
      )}
    </>
  );

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      {onOpenPicker ? (
        <button
          type="button"
          onClick={onOpenPicker}
          className="group flex min-w-0 items-center justify-between gap-2 rounded-lg px-0.5 py-0.5 text-left text-[10px] text-[#95a7ba] hover:text-[#e2d0ba] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#bfa078]"
          aria-label={`${label}, choisir un verset`}
        >
          {content}
        </button>
      ) : (
        <div
          className="flex min-w-0 items-center justify-between gap-2 px-0.5 text-[10px] text-[#95a7ba]"
          aria-live="polite"
        >
          {content}
        </div>
      )}
      <div
        className="h-0.5 w-full overflow-hidden rounded-full bg-[#162538]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
        aria-label={`Progression du verset ${activeAyah}`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-150 ease-linear"
          style={{
            width: `${progressPct}%`,
            backgroundColor: accentColor,
          }}
        />
      </div>
    </div>
  );
};
