"""Turn the full-size portrait PNGs into the small WebPs the game ships.

Reads assets/portraits/<character>/<mood>.png (the source of truth, any 3:4
size), lines every bust's flat bottom edge up with the bottom of the canvas,
scales it to 768 x 1024 and writes src/assets/portraits/<character>/<mood>.webp.
Run from the repository root after adding or replacing a portrait:

    python3 -m pip install pillow
    python3 tools/portraits.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'portraits'
OUT = ROOT / 'src' / 'assets' / 'portraits'
SIZE = (768, 1024)


def convert(path: Path) -> Path:
    image = Image.open(path).convert('RGBA')
    # Ignore faint stray pixels so a soft edge doesn't count as the bust.
    box = image.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
    if box is None:
        raise SystemExit(f'{path} is fully transparent')
    # Generators leave a different empty strip under each bust; drop it so every bust sits on the bottom edge.
    width, height = image.size
    aligned = Image.new('RGBA', image.size)
    aligned.paste(image.crop((0, 0, width, box[3])), (0, height - box[3]))
    target = OUT / path.relative_to(SOURCE).with_suffix('.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    aligned.resize(SIZE, Image.LANCZOS).save(target, 'WEBP', quality=88, method=6)
    return target


def main() -> None:
    sources = sorted(SOURCE.glob('*/*.png'))
    for stale in OUT.glob('*/*.webp'):
        if not (SOURCE / stale.relative_to(OUT)).with_suffix('.png').exists():
            stale.unlink()
    for path in sources:
        target = convert(path)
        print(f'{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
