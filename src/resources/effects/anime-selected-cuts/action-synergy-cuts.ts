import { synergyContactCuts } from './action-synergy-contact.js';
import { synergyTravelCuts } from './action-synergy-travel.js';
import { synergyDramaticCuts } from './action-synergy-dramatic.js';
import { synergyGroundCuts } from './action-synergy-ground.js';
import type { Cut } from './types.js';

/** 추천 순서와 실제 사용 기법을 같은 목록에 둬 연출실 표시와 제작 기록을 맞춘다. */
export const actionSynergyCuts: readonly (Cut & {
  readonly techniques: readonly string[];
})[] = [
  {
    ...synergyContactCuts[0]!,
    techniques: [
      '나카누키',
      '스미어 프레임',
      '히트스톱',
      '임팩트 프레임',
      '방향성 반동',
    ],
  },
  {
    ...synergyTravelCuts[0]!,
    techniques: [
      '배경 동화',
      '속도선·유선',
      '스미어 프레임',
      '배경 블러',
      '접촉 강조',
    ],
  },
  {
    ...synergyContactCuts[1]!,
    techniques: ['연타 박자 대비', '스트로보', '히트스톱', '쇼크코마'],
  },
  {
    ...synergyTravelCuts[1]!,
    techniques: ['나카누키', '스트로보', '정적 대비', '지연 타격'],
  },
  {
    ...synergyDramaticCuts[0]!,
    techniques: ['불릿 타임', '마와리코미', '스미어 프레임', '접촉 구도 정착'],
  },
  {
    ...synergyGroundCuts[0]!,
    techniques: [
      '스쿼시 앤 스트레치',
      '임팩트 프레임',
      '나카무라 큐브',
      '안노 폭발',
      '화면 흔들림',
    ],
  },
  {
    ...synergyDramaticCuts[1]!,
    techniques: ['컷인', '집중선', '쇼크코마', '멈춘 그림'],
  },
];
