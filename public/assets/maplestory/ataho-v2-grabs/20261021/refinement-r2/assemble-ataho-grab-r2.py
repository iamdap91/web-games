#!/usr/bin/env python3
"""완료된 PixelLab 구간을 같은 기술·방향끼리 원본 그대로 조립한다."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any
from PIL import Image

BASE = Path('public/assets/maplestory/ataho-v2-grabs/20261021/refinement-r2')
TECHNIQUES = ('ground-throw', 'sacrifice-throw')
DIRECTIONS = ('south-east', 'north-east')
# 최종 원본을 보고 아래 명시 배열만 조정하면 된다. 단위는 ms, 순서는 원본 index 순이다.
LOAD_DURATIONS = [100, 80, 80, 80, 80, 80, 80, 80, 80]  # load 0..8
CENTER_DURATION = 120
THROW_DURATIONS = [50, 50, 50, 50, 50, 50, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80]  # throw 1..16
END_DURATION = 650


def require_dict(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ValueError(f'{label}: 객체가 필요합니다.')
    return value


def image_data(value: Any, root: Path, label: str) -> tuple[str, bytes]:
    frame = require_dict(value, label)
    local = frame.get('localPath')
    if not isinstance(local, str) or not local:
        raise ValueError(f'{label}.localPath: 경로가 필요합니다.')
    path = Path(local)
    path = (path if path.is_absolute() else root / path).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError(f'{label}: root 내부 원본이 없습니다: {local}')
    expected_hash = frame.get('sha256')
    if expected_hash is not None and expected_hash != hashlib.sha256(path.read_bytes()).hexdigest():
        raise ValueError(f'{label}: 원본 sha256이 기록과 다릅니다: {local}')
    with Image.open(path) as source:
        if source.size != (192, 144) or source.mode != 'RGBA':
            raise ValueError(f'{label}: 192×144 RGBA 필요, 현재 {source.size} {source.mode}')
        pixels = source.tobytes()
    return path.relative_to(root).as_posix(), pixels


def segment(results: dict[str, dict[str, Any]], clip_id: str, stage: str, count: int) -> tuple[str, list[dict[str, Any]]]:
    result_id = f'{clip_id}-{stage}'
    result = results.get(result_id)
    if result is None:
        raise ValueError(f'{result_id}: 완료 구간이 없습니다.')
    if result.get('stage') != stage:
        raise ValueError(f'{result_id}: stage가 {stage}와 다릅니다.')
    frames = result.get('frames')
    if not isinstance(frames, list) or len(frames) != count:
        raise ValueError(f'{result_id}: {count}장 완료 필요, 현재 {len(frames) if isinstance(frames, list) else 0}장')
    indexed = {}
    for frame in frames:
        frame = require_dict(frame, result_id)
        index = frame.get('index')
        if isinstance(index, bool) or not isinstance(index, int) or index in indexed:
            raise ValueError(f'{result_id}: 유효하지 않거나 중복된 index: {index}')
        indexed[index] = frame
    if stage != 'key-c' and set(indexed) != set(range(count)):
        raise ValueError(f'{result_id}: index 0..{count - 1} 전체가 필요합니다.')
    return result_id, [indexed[index] for index in sorted(indexed)]


def assemble(results: dict[str, dict[str, Any]], root: Path, technique: str, direction: str, previous: dict[str, Any]) -> dict[str, Any]:
    clip_id = f'{technique}-{direction}'
    load_id, load = segment(results, clip_id, 'load', 9)
    center_id, center = segment(results, clip_id, 'key-c', 1)
    throw_id, throw = segment(results, clip_id, 'throw', 17)
    # throw[0]은 입력 C와 동일해야 한다. 입력 출처 검증 후 중복 삽입을 피한다.
    _, center_pixels = image_data(center[0], root, center_id)
    _, throw_start_pixels = image_data(throw[0], root, f'{throw_id}[0]')
    if center_pixels != throw_start_pixels:
        raise ValueError(f'{throw_id}[0]: exact key-c 입력 원본과 RGBA가 다릅니다.')
    entries = [(frame, duration, '잡기·중심 이동', 'load') for frame, duration in zip(load, LOAD_DURATIONS, strict=True)]
    entries.append((center[0], CENTER_DURATION, '중심 지지', 'key-c'))
    entries.extend((frame, duration, '던짐·착지·복귀', 'throw') for frame, duration in zip(throw[1:], THROW_DURATIONS, strict=True))
    end = {'localPath': str(BASE / 'references' / f'end-{clip_id}.png'), 'index': 0}
    entries.append((end, END_DURATION, '정리', 'end'))
    playback = []
    last_pixels = None
    for frame, duration, phase, stage in entries:
        if isinstance(duration, bool) or not isinstance(duration, int) or duration <= 0:
            raise ValueError(f'{clip_id}: duration은 양의 정수여야 합니다.')
        path, pixels = image_data(frame, root, f'{clip_id}/{stage}[{frame["index"]}]')
        entry = {'localPath': path, 'durationMs': duration, 'phase': phase, 'sourceStage': stage, 'sourceIndex': frame['index']}
        if playback and pixels == last_pixels:
            prior = playback[-1]
            prior['durationMs'] += duration
            merged = prior.setdefault('mergedSources', [{'sourceStage': prior['sourceStage'], 'sourceIndex': prior['sourceIndex'], 'localPath': prior['localPath']}])
            merged.append({'sourceStage': stage, 'sourceIndex': frame['index'], 'localPath': path})
        else:
            playback.append(entry)
        last_pixels = pixels
    return {**previous, 'id': clip_id, 'technique': technique, 'direction': direction,
            'sourceSegments': [{'id': load_id, 'stage': 'load', 'frameCount': 9}, {'id': center_id, 'stage': 'key-c', 'frameCount': 1}, {'id': throw_id, 'stage': 'throw', 'frameCount': 17}],
            'externalInterpolationFramesAdded': False, 'sourceImageTransformsApplied': False,
            'playback': {**require_dict(previous.get('playback', {}), f'{clip_id}.playback'), 'frames': playback}}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--record', required=True, type=Path)
    args = parser.parse_args()
    try:
        root = args.root.resolve()
        record = require_dict(json.loads(args.record.read_text(encoding='utf-8')), 'record')
        raw_results = record.get('results')
        if not root.is_dir() or not isinstance(raw_results, list):
            raise ValueError('--root 폴더와 record.results 배열이 필요합니다.')
        results = {}
        for value in raw_results:
            result = require_dict(value, 'record.results')
            result_id = result.get('id')
            if not isinstance(result_id, str) or result_id in results:
                raise ValueError(f'record.results: id가 없거나 중복입니다: {result_id}')
            results[result_id] = result
        old_clips = {clip['id']: clip for clip in record.get('clips', []) if isinstance(clip, dict) and isinstance(clip.get('id'), str)}
        clips, errors = [], []
        for technique in TECHNIQUES:
            for direction in DIRECTIONS:
                clip_id = f'{technique}-{direction}'
                try:
                    clips.append(assemble(results, root, technique, direction, old_clips.get(clip_id, {})))
                except (OSError, ValueError, TypeError) as error:
                    errors.append(str(error))
        if errors:
            raise ValueError('조립 불가; record는 저장하지 않았습니다.\n' + '\n'.join(errors))
        record['clips'] = clips
        args.record.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'record': str(args.record.resolve()), 'clips': [{'id': clip['id'], 'frameCount': len(clip['playback']['frames']), 'durationMs': sum(frame['durationMs'] for frame in clip['playback']['frames'])} for clip in clips]}, ensure_ascii=False, indent=2))
    except (OSError, ValueError, TypeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
