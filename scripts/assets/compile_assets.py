"""Compile approved/generated source art into the Godot asset pipeline.

This is the single user-facing asset command. Source generation happens outside
the repository tooling; compilation owns all deterministic conversion,
assembly, Godot resource generation, and validation steps.
"""

from __future__ import annotations

from pathlib import Path
import os
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[2]
GODOT = Path("/Applications/Godot.app/Contents/MacOS/Godot")
LOG_PATH = ROOT / ".godot" / "codex-asset-compile.log"
PYTHON = Path(os.environ.get("CAFFEINE_PYTHON", sys.executable))


def run(label: str, command: list[str]) -> None:
    print(f"==> {label}")
    result = subprocess.run(command, cwd=ROOT)
    if result.returncode != 0:
        raise SystemExit(result.returncode)


def main() -> int:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    run(
        "Convert sources, build the atlas, previews, and manifest",
        [str(PYTHON), "scripts/assets/build_cafe_assets_48.py"],
    )
    run(
        "Generate the Godot TileSet resource",
        [
            str(GODOT),
            "--headless",
            "--log-file",
            str(LOG_PATH),
            "--path",
            str(ROOT),
            "-s",
            "res://scripts/assets/create_cafe_tileset_48_resource.gd",
        ],
    )
    run(
        "Validate 48px assets, atlas, TileSet, and cafe room",
        [str(PYTHON), "scripts/assets/validate_48px_assets.py"],
    )
    print("Asset compilation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
