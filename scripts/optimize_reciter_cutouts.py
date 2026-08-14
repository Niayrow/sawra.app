"""
Compose / optimize reciter cutouts for the site.

- Converts each cutout PNG → WebP (alpha kept) for light delivery
- Optimizes background.png → background.webp
- Does NOT bake the background into portraits: the site layers them in CSS
  (ReciterPortrait) so swapping a cutout updates live.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "public" / "reciters"
MAX_EDGE = 768
WEBP_QUALITY = 82
BG_QUALITY = 80


def to_webp(src: Path, dest: Path, *, max_edge: int, quality: int, keep_alpha: bool) -> None:
    im = Image.open(src)
    if keep_alpha:
        im = im.convert("RGBA")
    else:
        im = im.convert("RGB")

    w, h = im.size
    scale = min(1.0, max_edge / max(w, h))
    if scale < 1.0:
        im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)

    dest.parent.mkdir(parents=True, exist_ok=True)
    if keep_alpha:
        im.save(dest, "WEBP", quality=quality, method=6)
    else:
        im.save(dest, "WEBP", quality=quality, method=6)


def main() -> None:
    if not SRC_DIR.exists():
        raise SystemExit(f"Missing {SRC_DIR}")

    bg = SRC_DIR / "background.png"
    if not bg.exists():
        raise SystemExit("Missing public/reciters/background.png")

    out_bg = SRC_DIR / "background.webp"
    to_webp(bg, out_bg, max_edge=1280, quality=BG_QUALITY, keep_alpha=False)
    print(f"background.webp ({out_bg.stat().st_size // 1024} KB)")

    files = sorted(
        p
        for p in SRC_DIR.iterdir()
        if p.is_file()
        and p.suffix.lower() == ".png"
        and p.name.lower() != "background.png"
    )

    for path in files:
        out = SRC_DIR / f"{path.stem}.webp"
        to_webp(path, out, max_edge=MAX_EDGE, quality=WEBP_QUALITY, keep_alpha=True)
        print(f"  {path.name} -> {out.name} ({out.stat().st_size // 1024} KB)")

    print(f"Done ({len(files)} cutouts).")


if __name__ == "__main__":
    main()
