import {
  directionalKick,
  segment,
  strikePoint,
  strikeRootX,
  synergyBackdrop,
  synergyBear,
  synergyDust,
  synergyHero,
  synergyImpact,
  synergyLayout,
  synergyShadow,
  synergyShock,
  type SynergyPose,
} from './action-synergy-shared.js';
import { drawContactStar } from './causal-shared.js';
import { ease, fistSmear, lerp } from './drawing.js';
import type { CutAssets } from './assets.js';
import type { Context, Cut, CutFrame } from './types.js';

const timing = {
  thrust: 0.42,
  contact: 0.52,
  medium: 0.66,
  mediumContact: 0.75,
  detail: 0.9,
  detailContact: 0.99,
  returnWide: 1.16,
  release: 1.2,
  land: 1.65,
  settled: 2.45,
} as const;

type RepeatedShot = {
  readonly sourceTime: number;
  readonly contactTime: number;
  readonly magnification: number;
};

/** 두 번째·세 번째 제시는 같은 동작 시계로 돌아가고, 상대의 이동은 마지막 방출 뒤에만 진행한다. */
function repeatedShot(time: number): RepeatedShot {
  if (time < timing.medium)
    return {
      sourceTime: Math.min(time, timing.contact),
      contactTime: timing.contact,
      magnification: 1,
    };
  if (time < timing.detail)
    return {
      sourceTime: lerp(
        timing.thrust,
        timing.contact,
        segment(time, timing.medium, timing.mediumContact - timing.medium),
      ),
      contactTime: timing.mediumContact,
      magnification: 1.72,
    };
  if (time < timing.returnWide)
    return {
      sourceTime: lerp(
        timing.thrust,
        timing.contact,
        segment(time, timing.detail, timing.detailContact - timing.detail),
      ),
      contactTime: timing.detailContact,
      magnification: 3.05,
    };
  return {
    sourceTime: timing.contact + Math.max(0, time - timing.release),
    contactTime: timing.detailContact,
    magnification: 1,
  };
}

function strikePose(assets: CutAssets, sourceTime: number): SynergyPose {
  const contactX = strikeRootX(assets);
  const advance = segment(sourceTime, timing.thrust, 0.1);
  if (sourceTime < timing.thrust)
    return {
      action: 'punch',
      index: sourceTime < 0.21 ? 9 : sourceTime < 0.34 ? 10 : 11,
      x: contactX - 94,
    };
  if (sourceTime <= timing.contact)
    return {
      action: 'punch',
      index: advance < 0.24 ? 10 : advance < 0.63 ? 11 : 12,
      x: contactX - 94 * (1 - advance * advance),
    };
  const recovery = segment(sourceTime, timing.contact + 0.035, 0.23);
  return {
    action: 'punch',
    index: 12 + Math.min(4, Math.floor(recovery * 5)),
    x: contactX,
  };
}

function actors(context: Context, frame: CutFrame, sourceTime: number): void {
  const releaseAge = Math.max(0, frame.time - timing.release);
  const flight = segment(releaseAge, 0, timing.land - timing.release);
  const bearX = synergyLayout.bearX + 225 * ease(segment(releaseAge, 0, 0.22));
  const airborne = Math.sin(flight * Math.PI) * 68;
  synergyShadow(
    context,
    { x: bearX, y: synergyLayout.ground },
    100,
    1 - airborne / 180,
  );
  const touched = sourceTime >= timing.contact;
  synergyBear(context, frame, {
    x: bearX,
    y: synergyLayout.ground - airborne,
    state: releaseAge > 0.08 ? 'defeat' : touched ? 'hit' : 'stand',
    index:
      releaseAge > 0.08
        ? Math.floor(
            segment(releaseAge, 0.08, timing.land - timing.release - 0.08) *
              (frame.assets.bear.defeat.length - 1),
          )
        : 0,
  });
  const pose = strikePose(frame.assets, sourceTime);
  synergyShadow(context, { x: pose.x, y: synergyLayout.ground }, 55);
  synergyHero(context, frame.assets, pose);
}

function drawTripleShot(context: Context, frame: CutFrame): void {
  const time = Math.min(frame.time, timing.settled);
  const scene = { ...frame, time };
  const shot = repeatedShot(time);
  const point = strikePoint(frame.assets);
  context.save();
  // 타점을 화면의 같은 자리에 두고 컷으로 배율만 바꾼다. 보간 줌을 넣지 않는다.
  context.translate(point.x, point.y);
  context.scale(shot.magnification, shot.magnification);
  context.translate(-point.x, -point.y);
  context.translate(directionalKick(time - timing.release, 22, 0.14), 0);
  synergyBackdrop(context, scene, { time: shot.sourceTime });
  const shock = synergyShock(context, {
    time,
    contact: timing.detailContact,
    point,
    drawActors: (layer) => actors(layer, scene, shot.sourceTime),
  });
  if (!shock) {
    actors(context, scene, shot.sourceTime);
    if (shot.sourceTime >= timing.thrust && shot.sourceTime < timing.contact)
      fistSmear(
        context,
        point.x - 44,
        point.y,
        segment(shot.sourceTime, timing.thrust, 0.1),
        0,
        98,
      );
    drawContactStar(context, {
      point,
      age: time - shot.contactTime,
      size: shot.magnification > 2 ? 40 : 64,
    });
  }
  if (time >= timing.returnWide) {
    synergyImpact(context, scene, {
      point,
      contact: timing.release,
      size: 270,
      duration: 0.2,
    });
    synergyDust(context, scene, {
      x: synergyLayout.bearX + 225,
      contact: timing.land,
      size: 260,
      duration: 0.3,
    });
  }
  context.restore();
  if (time >= timing.medium && time < timing.returnWide) {
    context.save();
    context.fillStyle = '#11251ddd';
    context.fillRect(42, 45, 194, 45);
    context.font = '600 24px system-ui, sans-serif';
    context.fillStyle = '#e9f1df';
    context.fillText('↶ 같은 순간', 59, 76);
    context.restore();
  }
}

export const tripleShotCut: Cut & { readonly techniques: readonly string[] } = {
  id: 'causal-triple-shot',
  title: '한 타·세 숏',
  kind: '2D',
  duration: 2.75,
  description:
    '단 한 번의 정권 접촉을 와이드·상반신·접점의 세 크기로 다시 보여준다. 타점을 같은 화면 좌표에 고정하고 같은 준비·신전·피격 원화를 반복한 뒤, 넓은 구도로 돌아와 한 번만 상대를 밀어내고 쓰러뜨린다.',
  techniques: ['반복 쇼트', '접점 매치 컷', '쇼크코마', '결과 와이드'],
  beats: [
    { time: 0.2, label: '와이드 · 한 번의 정권 준비' },
    { time: timing.contact, label: '첫 제시 · 와이드 접촉' },
    { time: timing.medium, label: '같은 타격 재제시 · 상반신 컷' },
    { time: timing.mediumContact, label: '같은 접촉 · 밀림 없음' },
    { time: timing.detail, label: '같은 타격 재제시 · 접점 컷' },
    { time: timing.detailContact, label: '접점 쇼크코마 · 마지막 강조' },
    { time: timing.returnWide, label: '와이드 복귀 · 같은 시각의 두 배우' },
    { time: timing.release, label: '한 번의 방출 · 첫 실제 밀림' },
    { time: timing.land, label: '한 번의 착지 · 결과 확인' },
    { time: timing.settled, label: '잔심 · 종결' },
  ],
  draw: drawTripleShot,
};
