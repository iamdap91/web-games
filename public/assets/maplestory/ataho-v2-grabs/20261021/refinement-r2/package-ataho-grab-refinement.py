#!/usr/bin/env python3
"""PixelLab 잡기 원본 프레임을 변형하지 않고 GIF와 검토용 HTML로 포장한다."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import os
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


SOURCE_SIZE = (192, 144)
SCALE = 3
HEADER_HEIGHT = 48
DISPLAY_SIZE = (SOURCE_SIZE[0] * SCALE, SOURCE_SIZE[1] * SCALE + HEADER_HEIGHT)
OUTPUT_DIRECTORY = Path("public/assets/maplestory/ataho-v2-grabs/20261021/refinement-r2/previews")
TECHNIQUES = {"ground-throw": "지상 메치기", "sacrifice-throw": "누워 넘기기"}
DIRECTIONS = {"south-east": "남동쪽", "north-east": "북동쪽"}


def string(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{label}: 비어 있지 않은 문자열이 필요합니다.")
    return value


def positive_integer(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValueError(f"{label}: 양의 정수가 필요합니다.")
    return value


def source_path(value: Any, root: Path, label: str) -> Path:
    candidate = Path(string(value, label))
    candidate = (candidate if candidate.is_absolute() else root / candidate).resolve()
    if not candidate.is_relative_to(root):
        raise ValueError(f"{label}: 원본은 --root 내부에 있어야 합니다.")
    if not candidate.is_file():
        raise ValueError(f"{label}: 원본 파일이 없습니다: {candidate}")
    return candidate


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    ):
        if Path(candidate).is_file():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default(size=size)


def draw_label(canvas: Image.Image, position: tuple[int, int], text: str, size: int) -> None:
    # 글자 색이 GIF 팔레트를 불필요하게 늘리지 않도록 1비트 마스크를 쓴다.
    mask = Image.new("1", canvas.size)
    ImageDraw.Draw(mask).text(position, text, font=font(size), fill=1)
    canvas.paste("#edf2f5", (0, 0, *canvas.size), mask)


def background() -> Image.Image:
    canvas = Image.new("RGBA", SOURCE_SIZE, "#e0e5e9")
    draw = ImageDraw.Draw(canvas)
    for y in range(0, SOURCE_SIZE[1], 8):
        for x in range(0, SOURCE_SIZE[0], 8):
            if (x // 8 + y // 8) % 2:
                draw.rectangle((x, y, x + 7, y + 7), fill="#f0f3f5")
    # 바닥선은 원본과 독립적인 배경에만 그린다.
    draw.line((0, 128, SOURCE_SIZE[0] - 1, 128), fill="#86959e", width=1)
    return canvas


def display_frame(source: Image.Image, title: str, phase: str, index: int, total: int, duration: int) -> Image.Image:
    base = background()
    base.alpha_composite(source)
    canvas = Image.new("RGB", DISPLAY_SIZE, "#23313c")
    canvas.paste(base.convert("RGB").resize((576, 432), Image.Resampling.NEAREST), (0, HEADER_HEIGHT))
    draw_label(canvas, (10, 3), title, 17)
    draw_label(canvas, (10, 25), f"{index + 1:02d}/{total:02d} · {phase} · {duration}ms", 14)
    return canvas


def palettize(frames: list[Image.Image]) -> tuple[list[Image.Image], bool]:
    colors: set[tuple[int, int, int]] = set()
    for frame in frames:
        frame_colors = frame.getcolors(maxcolors=256)
        if frame_colors is None:
            break
        colors.update(color for _, color in frame_colors)
        if len(colors) > 256:
            break
    else:
        palette_colors = sorted(colors)
        indices = {color: index for index, color in enumerate(palette_colors)}
        palette = [channel for color in palette_colors for channel in color]
        results = []
        for frame in frames:
            result = Image.new("P", frame.size)
            result.putpalette(palette + [0] * (768 - len(palette)))
            result.putdata([indices[color] for color in frame.getdata()])
            results.append(result)
        return results, False

    # GIF에서만 공통 팔레트로 양자화한다. PNG 원본과 프레임시트는 손대지 않는다.
    atlas = Image.new("RGB", (DISPLAY_SIZE[0], DISPLAY_SIZE[1] * len(frames)))
    for index, frame in enumerate(frames):
        atlas.paste(frame, (0, index * DISPLAY_SIZE[1]))
    palette_image = atlas.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return [frame.quantize(palette=palette_image, dither=Image.Dither.NONE) for frame in frames], True


def save_gif(frames: list[Image.Image], durations: list[int], path: Path) -> None:
    frames[0].save(
        path, save_all=True, append_images=frames[1:], duration=durations,
        loop=0, disposal=2, optimize=False,
    )


def metadata(path: Path, root: Path) -> dict[str, Any]:
    result: dict[str, Any] = {
        "localPath": os.path.relpath(path, root),
        "byteSize": path.stat().st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }
    if path.suffix.lower() in (".gif", ".png"):
        with Image.open(path) as image:
            durations = []
            count = getattr(image, "n_frames", 1)
            for index in range(count):
                image.seek(index)
                durations.append(image.info.get("duration", 0))
            result.update(width=image.width, height=image.height, frameCount=count, durationsMs=durations)
    return result


def package_clip(value: Any, root: Path, output: Path) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError("record.clips 항목은 객체여야 합니다.")
    clip_id = string(value.get("id"), "clip.id")
    if not all(character.isascii() and (character.isalnum() or character in "-_.") for character in clip_id):
        raise ValueError("clip.id에는 영문 숫자와 -_. 문자만 사용할 수 있습니다.")
    if clip_id in (".", ".."):
        raise ValueError("clip.id는 파일 이름이어야 합니다.")
    technique = string(value.get("technique"), f"{clip_id}.technique")
    direction = string(value.get("direction"), f"{clip_id}.direction")
    playback = value.get("playback")
    frames = playback.get("frames") if isinstance(playback, dict) else None
    if not isinstance(frames, list) or not frames:
        raise ValueError(f"{clip_id}.playback.frames에 한 개 이상의 프레임이 필요합니다.")
    title = f"{TECHNIQUES.get(technique, technique)} · {DIRECTIONS.get(direction, direction)}"
    images = []
    durations = []
    originals = []
    phases = []
    for index, frame in enumerate(frames):
        label = f"{clip_id}.playback.frames[{index}]"
        if not isinstance(frame, dict):
            raise ValueError(f"{label}: 객체가 필요합니다.")
        path = source_path(frame.get("localPath"), root, f"{label}.localPath")
        duration = positive_integer(frame.get("durationMs"), f"{label}.durationMs")
        phase = string(frame.get("phase"), f"{label}.phase")
        with Image.open(path) as source:
            if source.size != SOURCE_SIZE or source.mode != "RGBA":
                raise ValueError(f"{path}: 원본은 192×144 RGBA여야 합니다. 현재 {source.size} {source.mode}")
            images.append(display_frame(source, title, phase, index, len(frames), duration))
        durations.append(duration)
        phases.append(phase)
        original = metadata(path, root)
        original.update(playbackIndex=index, phase=phase, durationMs=duration)
        originals.append(original)

    paletted, quantized = palettize(images)
    normal_path = output / f"{clip_id}.gif"
    slow_path = output / f"{clip_id}-slow.gif"
    sheet_path = output / f"{clip_id}-sheet.png"
    save_gif(paletted, durations, normal_path)
    save_gif(paletted, [duration * 2 for duration in durations], slow_path)
    columns = min(4, len(images))
    rows = math.ceil(len(images) / columns)
    sheet = Image.new("RGB", (DISPLAY_SIZE[0] * columns, DISPLAY_SIZE[1] * rows), "#23313c")
    for index, frame in enumerate(images):
        sheet.paste(frame, ((index % columns) * DISPLAY_SIZE[0], (index // columns) * DISPLAY_SIZE[1]))
    sheet.save(sheet_path)

    escaped_title = html.escape(title)
    previous = f"../../previews/{clip_id}-contact.gif"
    unique_phases = list(dict.fromkeys(phases))
    phase_text = " → ".join(html.escape(phase) for phase in unique_phases)
    article = f'''<article><h2>{escaped_title}</h2>
<p>{len(images)}프레임 · 원속도 {sum(durations)}ms · {phase_text}</p>
<div class="comparison">
<figure><img loading="lazy" src="{html.escape(previous, quote=True)}" alt="{escaped_title} 이전 A/B 접촉 시연"><figcaption>이전 · A/B 두 장, 상대 위치·회전 시연</figcaption></figure>
<figure><img src="{clip_id}.gif" alt="{escaped_title} PixelLab 상호작용 모션"><figcaption>개선안 · 원속도</figcaption></figure>
<figure><img loading="lazy" src="{clip_id}-slow.gif" alt="{escaped_title} 0.5배속"><figcaption>개선안 · 0.5배속</figcaption></figure>
</div><p><a href="{clip_id}.gif">원속도 GIF</a> · <a href="{clip_id}-slow.gif">0.5배속 GIF</a> · <a href="{clip_id}-sheet.png">전체 프레임시트</a></p>
<details><summary>전체 프레임 펼치기</summary><a href="{clip_id}-sheet.png"><img class="sheet" loading="lazy" src="{clip_id}-sheet.png" alt="{escaped_title} 전체 프레임시트"></a></details>
</article>'''
    return {
        "id": clip_id, "technique": technique, "direction": direction,
        "sourceFrames": originals, "requestedDurationsMs": durations,
        "gifPaletteQuantized": quantized, "gifPaletteScope": "GIF 전용; PNG 원본 및 프레임시트 무변경",
        "outputs": [metadata(path, root) for path in (normal_path, slow_path, sheet_path)],
        "previousContactGif": previous, "html": article,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--record", required=True, type=Path)
    parser.add_argument("--root", required=True, type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    try:
        if not root.is_dir():
            raise ValueError("--root 작업 폴더가 없습니다.")
        record = json.loads(args.record.read_text(encoding="utf-8"))
        clips = record.get("clips") if isinstance(record, dict) else None
        if not isinstance(clips, list) or not clips:
            raise ValueError("record.clips에 한 개 이상의 클립이 필요합니다.")
        ids = [clip.get("id") for clip in clips if isinstance(clip, dict)]
        if any(not isinstance(clip_id, str) for clip_id in ids) or len(ids) != len(set(ids)):
            raise ValueError("clip.id는 중복 없는 문자열이어야 합니다.")
        output = root / OUTPUT_DIRECTORY
        output.mkdir(parents=True, exist_ok=True)
        results = [package_clip(clip, root, output) for clip in clips]
        articles = "\n".join(result.pop("html") for result in results)
        document = '''<!doctype html>
<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>아타호 잡기 · 모션 개선안</title>
<style>
body{margin:0;padding:28px;background:#17212a;color:#e8edf0;font:16px/1.6 system-ui,sans-serif}main{max-width:1840px;margin:auto}h1{font-size:28px;margin:0 0 12px}h2{font-size:22px;margin:0}p{margin:10px 0}a{color:#add7ff}article{background:#23313c;padding:20px;margin:24px 0;border-radius:10px}.notice{background:#304654;padding:16px;border-radius:8px}.comparison{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}figure{margin:8px 0}img{display:block;max-width:100%;height:auto;image-rendering:pixelated}figcaption{font-size:14px;margin-top:6px}.sheet{width:100%;margin-top:12px}summary{cursor:pointer;color:#add7ff}details{margin-top:12px}@media(max-width:1200px){.comparison{grid-template-columns:1fr}body{padding:16px}}
</style><main><h1>아타호 잡기 · 모션 개선안</h1>
<div class="notice"><strong>잡기 모션 개선안</strong> 손으로 붙잡고, 상대의 무게를 받아 넘긴 뒤 자세를 회수합니다. 이전 버전·개선안·느린 재생을 나란히 비교할 수 있습니다.</div>
<p>지상 메치기는 등·어깨에 상대를 싣고 앞으로 넘깁니다. 누워 넘기기는 발바닥으로 받쳐 뒤로 넘기며, 회전 중 두 몸이 겹치는 구간이 남아 있습니다.</p>
''' + articles + "\n</main></html>\n"
        index_path = output / "index.html"
        index_path.write_text(document, encoding="utf-8")
        print(json.dumps({
            "record": str(args.record.resolve()), "root": str(root),
            "sourceCanvas": list(SOURCE_SIZE), "nearestNeighborScale": SCALE,
            "displayCanvas": list(DISPLAY_SIZE), "headerHeight": HEADER_HEIGHT,
            "sourceFilesModified": False, "syntheticTweenFramesAdded": False,
            "playbackDurationsFromRecord": True, "clips": results,
            "index": metadata(index_path, root),
        }, ensure_ascii=False, indent=2))
    except (OSError, ValueError, TypeError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
