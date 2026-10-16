import type {
  KiDefinition,
  KiHit,
  KiHitSample,
  KiPoint,
  KiSample,
  KiShot,
  KiShotSample,
} from './ki-types.js';

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 탐색과 일반 재생이 같은 위치를 내도록 경과 시간만으로 비행을 계산한다. */
export function sampleKiShot(shot: KiShot, timeMs: number): KiShotSample {
  const timeProgress = clamp(
    (timeMs - shot.launchMs) / Math.max(1, shot.arriveMs - shot.launchMs),
  );
  const progress =
    shot.travelCurve === 'ease-in' ? timeProgress * timeProgress : timeProgress;
  return {
    shot,
    point: {
      x: shot.from.x + (shot.to.x - shot.from.x) * progress,
      y:
        shot.from.y +
        (shot.to.y - shot.from.y) * progress +
        Math.sin(progress * Math.PI) * (shot.curveY ?? 0),
    },
    progress,
    visible: timeMs >= shot.launchMs && timeMs < shot.arriveMs,
    arrived: timeMs >= shot.arriveMs,
    ageMs: timeMs - shot.launchMs,
  };
}

/** 몸의 접촉 그림과 독립된 기공의 명중 좌표를 그리기·판정에서 공유한다. */
export function kiHitPoint(
  definition: KiDefinition,
  hit: KiHit,
  timeMs = hit.atMs,
): KiPoint {
  const shot = definition.shots.find((item) => item.id === hit.shotId);
  return shot ? sampleKiShot(shot, timeMs).point : hit.point;
}

export function sampleKiHit(
  definition: KiDefinition,
  hit: KiHit,
  timeMs: number,
): KiHitSample {
  const ageMs = timeMs - hit.atMs;
  return {
    hit,
    // 명중 뒤 잔광도 명중 시점에 고정하고 탄의 경과 위치로 옮기지 않는다.
    point: kiHitPoint(definition, hit),
    active: ageMs >= 0 && ageMs < hit.durationMs,
    occurred: ageMs >= 0,
    ageMs,
    progress: clamp(ageMs / Math.max(1, hit.durationMs)),
  };
}

export function sampleKi(definition: KiDefinition, timeMs: number): KiSample {
  const shots = definition.shots.map((shot) => sampleKiShot(shot, timeMs));
  const hits = definition.hits.map((hit) =>
    sampleKiHit(definition, hit, timeMs),
  );
  const lastHitEnd = Math.max(
    definition.releaseMs,
    ...definition.hits.map((hit) => hit.atMs + hit.durationMs),
  );
  const phase =
    timeMs >= definition.endMs
      ? 'done'
      : timeMs < definition.chargeStartMs
        ? 'idle'
        : timeMs < definition.releaseMs
          ? 'charge'
          : shots.some((shot) => shot.visible)
            ? 'travel'
            : timeMs < lastHitEnd
              ? 'sustain'
              : 'recover';
  return {
    timeMs,
    phase,
    charge: clamp(
      (timeMs - definition.chargeStartMs) /
        Math.max(1, definition.releaseMs - definition.chargeStartMs),
    ),
    shots,
    hits,
  };
}
