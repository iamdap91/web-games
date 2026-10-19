import type {
  KiDefinition,
  KiHit,
  KiHitSample,
  KiPoint,
  KiSample,
  KiShot,
  KiShotSample,
} from './ki-types.js';

import { sampleCircusShot } from './meteor-circus-flight.js';

export const orbitActivationMs = 130;

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 탐색과 일반 재생이 같은 위치를 내도록 경과 시간만으로 비행을 계산한다. */
export function sampleKiShot(shot: KiShot, timeMs: number): KiShotSample {
  if (shot.circusFlight) {
    const point = sampleCircusShot(shot.circusFlight, timeMs);
    return {
      shot,
      point: { x: point.x, y: -point.y },
      progress: clamp(
        (timeMs - shot.launchMs) / (shot.arriveMs - shot.launchMs),
      ),
      visible: timeMs >= shot.launchMs && timeMs < shot.arriveMs,
      arrived: timeMs >= shot.arriveMs,
      ageMs: timeMs - shot.launchMs,
    };
  }
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

export function beamChargePoint(
  definition: KiDefinition,
  sample: KiSample,
): KiPoint {
  const origin = definition.chargeOrigin ?? definition.origin;
  const compression = clamp((sample.charge - 0.84) / 0.16);
  return {
    x: origin.x + (definition.origin.x - origin.x) * compression,
    y: origin.y + (definition.origin.y - origin.y) * compression,
  };
}

/** 호격권 장전핵은 뒤로 당긴 주먹에서 마지막 전진과 함께 방출점으로 옮긴다. */
export function tigerChargePoint(
  definition: KiDefinition,
  sample: KiSample,
): KiPoint {
  const from = definition.chargeOrigin ?? definition.origin;
  const progress = clamp((sample.timeMs - definition.releaseMs + 40) / 40);
  return {
    x: from.x + (definition.origin.x - from.x) * progress,
    y: from.y + (definition.origin.y - from.y) * progress,
  };
}

/** 대기탄의 생성·퍼짐·발사 전 수명을 그림과 조명이 공유한다. */
export function sampleOrbitHeld(definition: KiDefinition, sample: KiSample) {
  return definition.shots.flatMap((shot, index) => {
    const formMs = definition.chargeStartMs + index * 90;
    if (sample.timeMs < formMs || sample.timeMs >= shot.launchMs) return [];
    const formAge = sample.timeMs - formMs;
    const growth = clamp(formAge / 180);
    const spread = 1 - Math.pow(1 - growth, 3);
    return [
      {
        shot,
        index,
        formAge,
        growth,
        point: {
          x:
            definition.origin.x +
            (shot.from.x - shot.radius - definition.origin.x) * spread,
          y: definition.origin.y + (shot.from.y - definition.origin.y) * spread,
        },
        activation: clamp(
          (sample.timeMs - shot.launchMs + orbitActivationMs) /
            orbitActivationMs,
        ),
      },
    ];
  });
}
