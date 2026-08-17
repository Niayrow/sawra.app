"""
Génère toutes les icônes site / PWA / Android / iOS à partir de :
  - public/icons/site-logo-source.png → logo UI + PWA (fond transparent)
  - public/icons/app-icon-source.png → source brute (référence / recadrage)
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
public = ROOT / "public"
icons = public / "icons"

SITE_SRC = icons / "sansfond.png"
APP_SRC = icons / "app-icon-source.png"

# Fond splash / OG / adaptive Android — thème Sawra
APP_BG = (7, 17, 29)  # #07111d
# Fond icône PWA / apple-touch : opaque (iOS/Android remplissent l’alpha en blanc)
ICON_BG = (0, 0, 0)  # #000000


def knock_out_black(im: Image.Image, threshold: int = 28) -> Image.Image:
    """Rend le noir (et quasi-noir) transparent pour le logo site."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= threshold and g <= threshold and b <= threshold:
                px[x, y] = (0, 0, 0, 0)
            elif r < threshold + 40 and g < threshold + 40 and b < threshold + 40:
                # Adoucir les bords sombres
                darkness = max(r, g, b)
                soft = max(0, min(255, int((darkness - threshold) * (255 / 40))))
                px[x, y] = (r, g, b, min(a, soft))
    return im


def crop_square(im: Image.Image) -> Image.Image:
    side = min(im.size)
    left = (im.width - side) // 2
    top = (im.height - side) // 2
    return im.crop((left, top, left + side, top + side))


def trim_outer_black(im: Image.Image, threshold: int = 12, pad: int = 8) -> Image.Image:
    """Recadre le canvas noir autour d'une app icon (garde le squircle)."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    min_x, min_y, max_x, max_y = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 8 and (r > threshold or g > threshold or b > threshold):
                found = True
                if x < min_x:
                    min_x = x
                if y < min_y:
                    min_y = y
                if x > max_x:
                    max_x = x
                if y > max_y:
                    max_y = y
    if not found:
        return im
    min_x = max(0, min_x - pad)
    min_y = max(0, min_y - pad)
    max_x = min(w - 1, max_x + pad)
    max_y = min(h - 1, max_y + pad)
    return im.crop((min_x, min_y, max_x + 1, max_y + 1))


def resize_rgba(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.Resampling.LANCZOS)


def on_bg(img: Image.Image, size: int, bg=APP_BG) -> Image.Image:
    layer = resize_rgba(img.convert("RGBA"), size)
    base = Image.new("RGBA", (size, size), (*bg, 255))
    return Image.alpha_composite(base, layer).convert("RGB")


def fit_cover_rgb(img: Image.Image, size: int) -> Image.Image:
    """Redimensionne une app icon opaque pour remplir le carré."""
    sq = crop_square(img.convert("RGBA"))
    return resize_rgba(sq, size).convert("RGB")


def fit_contain_transparent(img: Image.Image, size: int, ratio: float = 1.0) -> Image.Image:
    """Centre le logo sur fond transparent (PWA / stores)."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    content = resize_rgba(img.convert("RGBA"), int(size * ratio))
    offset = ((size - content.width) // 2, (size - content.height) // 2)
    canvas.alpha_composite(content, dest=offset)
    return canvas


def fit_contain_on_bg(img: Image.Image, size: int, ratio: float = 1.0, bg=APP_BG) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (*bg, 255))
    content = resize_rgba(img.convert("RGBA"), int(size * ratio))
    offset = ((size - content.width) // 2, (size - content.height) // 2)
    canvas.alpha_composite(content, dest=offset)
    return canvas.convert("RGB")


def trim_alpha_to_square(im: Image.Image, pad_ratio: float = 0.06) -> Image.Image:
    """Recadre sur le contenu opaque puis recentre dans un carré (favicons plus lisibles)."""
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    trimmed = im.crop(bbox)
    side = max(trimmed.width, trimmed.height)
    pad = max(2, int(side * pad_ratio))
    canvas_side = side + pad * 2
    canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
    offset = ((canvas_side - trimmed.width) // 2, (canvas_side - trimmed.height) // 2)
    canvas.alpha_composite(trimmed, dest=offset)
    return canvas


# --- Sources ---
if not SITE_SRC.exists():
    raise SystemExit(f"Missing {SITE_SRC}")
if not APP_SRC.exists():
    raise SystemExit(f"Missing {APP_SRC}")

# Préférer la source brute si dispo (évite de re-cropper un sansfond déjà traité)
site_master = icons / "site-logo-source.png"
site_raw = Image.open(site_master if site_master.exists() else SITE_SRC).convert("RGBA")
# Si le fichier source a encore un fond noir, on le retire
site = knock_out_black(crop_square(site_raw))
site.save(SITE_SRC, "PNG", optimize=True)
print(f"updated transparent {SITE_SRC.relative_to(ROOT)}")

# Favicon : logo plus gros dans l’onglet (peu de marge transparente)
site_favicon = trim_alpha_to_square(site, pad_ratio=0.04)

app_raw = Image.open(APP_SRC).convert("RGBA")
# Garder l'icône cadrée (squircle + bordure) pour PWA / stores
app = crop_square(app_raw)
# Version plein cadre pour launchers (moins de bande noire inutile)
app_tight = crop_square(trim_outer_black(app_raw, pad=4))

# --- Transparent UI ---
resize_rgba(site, 512).save(icons / "logo.png", "PNG", optimize=True)
print("transparent logo.png 512")

# --- Favicons (contenu recadré = plus grand dans l’onglet) ---
favicon_targets = {
    icons / "favicon-16x16.png": 16,
    icons / "favicon-32x32.png": 32,
    icons / "favicon-180x180.png": 180,
    icons / "favicon-192x192.png": 192,
    public / "favicon-192.png": 192,
}

for path, size in favicon_targets.items():
    resize_rgba(site_favicon, size).save(path, "PNG", optimize=True)
    print(f"favicon {path.relative_to(ROOT)} {size}")

ico_sizes = [16, 32, 48]
ico_imgs = [resize_rgba(site_favicon, s) for s in ico_sizes]
ico_imgs[0].save(icons / "favicon.ico", format="ICO", sizes=[(s, s) for s in ico_sizes])
ico_imgs[0].save(public / "favicon.ico", format="ICO", sizes=[(s, s) for s in ico_sizes])
print("favicon.ico (icons + public)")

resize_rgba(site, 1024).save(icons / "icon-1024.png", "PNG", optimize=True)

# --- PWA / app icons (fond noir opaque) ---
# ~0.88 : logo bien visible ; marge pour coins arrondis OS
PWA_ZOOM = 0.88
MASKABLE_ZOOM = 0.72

# Noms versionnés : /icons/* est en cache immutable côté CDN/navigateurs
PWA_ASSET_TAG = "v2"

pwa_targets = {
    icons / "apple-touch-icon.png": 180,
    icons / f"apple-touch-icon-{PWA_ASSET_TAG}.png": 180,
    icons / "android-chrome-192x192.png": 192,
    icons / f"android-chrome-192x192-{PWA_ASSET_TAG}.png": 192,
    icons / "android-chrome-512x512.png": 512,
    icons / f"android-chrome-512x512-{PWA_ASSET_TAG}.png": 512,
    icons / "artwork.png": 512,
    icons / "app icon.png": 1024,
    icons / "appicon.png": 1024,
    public / "apple-touch-icon.png": 180,
    public / f"apple-touch-icon-{PWA_ASSET_TAG}.png": 180,
    public / "icon.png": 512,
    public / "appicon.png": 1024,
}

for path, size in pwa_targets.items():
    fit_contain_on_bg(site, size, PWA_ZOOM, bg=ICON_BG).save(path, "PNG", optimize=True)
    print(f"pwa {path.relative_to(ROOT)} {size} zoom={PWA_ZOOM} bg=#000000")

# UI legacy (WebP) — même logo, fond noir
webp_im = fit_contain_on_bg(site, 192, PWA_ZOOM, bg=ICON_BG)
webp_im.save(icons / "appicon.webp", "WEBP", quality=86, method=6)
print(f"pwa {icons / 'appicon.webp'} {webp_im.size} bg=#000000")

# Transparent UI logo (WebP)
sansfond_webp = icons / "sansfond.webp"
webp_logo = resize_rgba(site, 320)
webp_logo.save(sansfond_webp, "WEBP", quality=82, method=6)
print(f"logo {sansfond_webp.relative_to(ROOT)} {webp_logo.size}")

for mask_name, mask_size in (
    ("maskable-192x192.png", 192),
    (f"maskable-192x192-{PWA_ASSET_TAG}.png", 192),
    ("maskable-512x512.png", 512),
    (f"maskable-512x512-{PWA_ASSET_TAG}.png", 512),
):
    fit_contain_on_bg(site, mask_size, MASKABLE_ZOOM, bg=ICON_BG).save(icons / mask_name, "PNG", optimize=True)
print(f"maskable 192/512 zoom={MASKABLE_ZOOM} bg=#000000 tag={PWA_ASSET_TAG}")

# OG image
og = Image.new("RGBA", (1200, 630), (*APP_BG, 255))
logo = resize_rgba(site, 380)
og.alpha_composite(logo, dest=((1200 - logo.width) // 2, (630 - logo.height) // 2))
og.convert("RGB").save(public / "og-image.png", "PNG", optimize=True)
print("og-image")

# --- iOS (1024) ---
ios_icon = (
    ROOT
    / "ios"
    / "App"
    / "App"
    / "Assets.xcassets"
    / "AppIcon.appiconset"
    / "AppIcon-512@2x.png"
)
fit_contain_on_bg(site, 1024, PWA_ZOOM, bg=ICON_BG).save(ios_icon, "PNG", optimize=True)
print(f"ios {ios_icon.relative_to(ROOT)} bg=#000000")

# --- Android ---
android_res = ROOT / "android" / "app" / "src" / "main" / "res"
android_sizes = {
    "mipmap-mdpi": {"launcher": 48, "foreground": 108},
    "mipmap-hdpi": {"launcher": 72, "foreground": 162},
    "mipmap-xhdpi": {"launcher": 96, "foreground": 216},
    "mipmap-xxhdpi": {"launcher": 144, "foreground": 324},
    "mipmap-xxxhdpi": {"launcher": 192, "foreground": 432},
}

for folder, sizes in android_sizes.items():
    dens = android_res / folder
    dens.mkdir(parents=True, exist_ok=True)
    launcher = fit_contain_transparent(site, sizes["launcher"], PWA_ZOOM)
    launcher.save(dens / "ic_launcher.png", "PNG", optimize=True)
    launcher.save(dens / "ic_launcher_round.png", "PNG", optimize=True)

    # Adaptive foreground : logo transparent (safe zone)
    fg_size = sizes["foreground"]
    fg = fit_contain_transparent(site, fg_size, 0.58)
    fg.save(dens / "ic_launcher_foreground.png", "PNG", optimize=True)
    print(f"android {folder}")

(android_res / "values" / "ic_launcher_background.xml").write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n'
    "<resources>\n"
    '    <color name="ic_launcher_background">#07111d</color>\n'
    "</resources>\n",
    encoding="utf-8",
)
print("android background #07111d")

# drawable background legacy
drawable_bg = android_res / "drawable" / "ic_launcher_background.xml"
if drawable_bg.exists():
    # keep vector if present; color resource already updated
    pass

print("DONE")
