"""
Reprocess public/reciters portraits onto Sawra brand background
(night #07111d + copper/beige halo + steel mist), matching body CSS.
"""
from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import remove

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "public" / "reciters"
BACKUP_DIR = SRC_DIR / "_original"
MAX_SIZE = 768
COPPER = np.array([206, 166, 135], dtype=np.float32)  # #cea687
STEEL = np.array([121, 144, 161], dtype=np.float32)  # #7990a1


def brand_background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = yy / max(h - 1, 1)
    rgb = np.stack(
        [
            7 + (13 - 7) * t,
            17 + (22 - 17) * t,
            29 + (34 - 29) * t,
        ],
        axis=-1,
    )

    cx, cy = w * 0.5, h * 0.18
    r_copper = max(w, h) * 0.55
    d1 = np.hypot(xx - cx, yy - cy) / r_copper
    copper_a = np.clip(0.22 * (1.0 - np.clip(d1, 0, 1)) ** 2, 0, 1)[..., None]

    cx2, cy2 = w * 0.08, h * 0.95
    r_steel = max(w, h) * 0.55
    d2 = np.hypot(xx - cx2, yy - cy2) / r_steel
    steel_a = np.clip(0.10 * (1.0 - np.clip(d2, 0, 1)) ** 2, 0, 1)[..., None]

    rgb = rgb * (1 - copper_a) + COPPER * copper_a
    rgb = rgb * (1 - steel_a) + STEEL * steel_a
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), mode="RGB")


def resize_max(img: Image.Image, max_size: int = MAX_SIZE) -> Image.Image:
    w, h = img.size
    scale = min(1.0, max_size / max(w, h))
    if scale >= 1.0:
        return img
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return img.resize((nw, nh), Image.Resampling.LANCZOS)


def process_one(path: Path) -> Path:
    original = Image.open(path).convert("RGBA")
    original = resize_max(original)

    cutout = remove(original)
    if not isinstance(cutout, Image.Image):
        cutout = Image.open(cutout).convert("RGBA")
    else:
        cutout = cutout.convert("RGBA")

    bg = brand_background(cutout.size).convert("RGBA")
    composed = Image.alpha_composite(bg, cutout).convert("RGB")

    out_name = path.stem + ".png"
    out_path = SRC_DIR / out_name
    composed.save(out_path, format="PNG", optimize=True)

    # If original was .jpg and we wrote .png, remove the jpg after success
    if path.suffix.lower() in {".jpg", ".jpeg"} and out_path != path:
        path.unlink(missing_ok=True)

    return out_path


def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(
        p
        for p in SRC_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}
    )
    if not files:
        raise SystemExit(f"No images found in {SRC_DIR}")

    print(f"Processing {len(files)} images...")
    for path in files:
        backup_path = BACKUP_DIR / path.name
        if not backup_path.exists():
            shutil.copy2(path, backup_path)
        print(f"  -> {path.name}")
        out = process_one(path)
        print(f"     saved {out.name} ({out.stat().st_size // 1024} KB)")

    print("Done.")


if __name__ == "__main__":
    main()
