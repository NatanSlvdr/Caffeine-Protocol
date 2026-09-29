"""Turn the full-size cutscene stills into the WebPs the game ships.

Reads assets/cutscenes/<scene>/<nn>.png (or .jpg; the source of truth, any
size, ideally 16:9), crops it to 16:9 around the centre, scales it to
1920 x 1080 and writes src/assets/cutscenes/<scene>/<nn>.webp. Panels are
numbered from 01 in the order they play. Run from the repository root after
adding or replacing a still:

    python3 -m pip install pillow
    python3 tools/cutscenes.py
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets' / 'cutscenes'
OUT = ROOT / 'src' / 'assets' / 'cutscenes'
SIZE = (1920, 1080)
FORMATS = ('.png', '.jpg', '.jpeg')


def convert(path: Path) -> Path:
    image = Image.open(path).convert('RGB')
    # Crop the long side to 16:9, never letterbox: the game frames every still as a 16:9 print.
    still = ImageOps.fit(image, SIZE, Image.LANCZOS)
    target = OUT / path.relative_to(SOURCE).with_suffix('.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    still.save(target, 'WEBP', quality=82, method=6)
    return target


def main() -> None:
    sources = sorted(p for p in SOURCE.glob('*/*') if p.suffix.lower() in FORMATS)
    wanted = {path.relative_to(SOURCE).with_suffix('') for path in sources}
    for stale in OUT.glob('*/*.webp'):
        if stale.relative_to(OUT).with_suffix('') not in wanted:
            stale.unlink()
    for path in sources:
        target = convert(path)
        print(f'{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
