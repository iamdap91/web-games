import type { CircusFlightShot } from './meteor-circus-flight.js';
import type { ComboMotion } from './types.js';

/** 몸의 시작 위치·지면을 원점으로 하는 96px 원본 배율의 좌표다. */
export type KiPoint = { readonly x: number; readonly y: number };

export type KiShot = {
  readonly id: string;
  readonly launchMs: number;
  readonly arriveMs: number;
  readonly from: KiPoint;
  readonly to: KiPoint;
  // 비행 구간의 가운데에서 가장 크게 휘는 높이이며 끝점에는 영향을 주지 않는다.
  readonly curveY?: number;
  // 추격 컷의 비행과 명중은 동일한 공간 안무를 시간으로 샘플한다.
  readonly circusFlight?: CircusFlightShot;
  // 설치 탄의 가속도 그림·도달 판정이 같은 시간 샘플을 쓰게 한다.
  readonly travelCurve?: 'ease-in';
  readonly radius: number;
};

export type KiHit = {
  readonly id: string;
  readonly atMs: number;
  readonly durationMs: number;
  readonly point: KiPoint;
  readonly radius: number;
  readonly strength: number;
  readonly reaction: 'horizontal' | 'rising' | 'falling';
  // 투사체와 연결된 명중은 같은 시간의 비행 좌표를 판정·그림에서 함께 쓴다.
  readonly shotId?: string;
};

export type KiDefinition = {
  readonly style:
    | 'orb'
    | 'tiger-manifest'
    | 'tiger-wave'
    | 'beam'
    | 'crescent'
    | 'eruption'
    | 'orbit'
    | 'meteor';
  readonly accent: string;
  readonly chargeStartMs: number;
  readonly releaseMs: number;
  readonly endMs: number;
  readonly origin: KiPoint;
  readonly chargeOrigin?: KiPoint;
  readonly target: KiPoint;
  readonly shots: readonly KiShot[];
  readonly hits: readonly KiHit[];
};

export type KiMotion = ComboMotion & { readonly ki: KiDefinition };

export type KiShotSample = {
  readonly shot: KiShot;
  readonly point: KiPoint;
  readonly progress: number;
  readonly visible: boolean;
  readonly arrived: boolean;
  readonly ageMs: number;
};

export type KiHitSample = {
  readonly hit: KiHit;
  readonly point: KiPoint;
  readonly active: boolean;
  readonly occurred: boolean;
  readonly ageMs: number;
  readonly progress: number;
};

export type KiSample = {
  readonly timeMs: number;
  readonly phase: 'idle' | 'charge' | 'travel' | 'sustain' | 'recover' | 'done';
  readonly charge: number;
  readonly shots: readonly KiShotSample[];
  readonly hits: readonly KiHitSample[];
};
