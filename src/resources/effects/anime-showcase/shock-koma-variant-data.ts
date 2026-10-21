export type ShockKomaVariantId =
  | 'ink'
  | 'embers'
  | 'whiteout'
  | 'compression'
  | 'brush'
  | 'misregister'
  | 'halftone';

export type ShockKomaVariant = {
  readonly id: ShockKomaVariantId;
  readonly name: string;
  readonly description: string;
  readonly distinction: string;
  readonly previewMs: number;
  readonly beats: readonly {
    readonly timeMs: number;
    readonly label: string;
  }[];
  readonly cuts: readonly number[];
  readonly finishMs: number;
};

export const shockKomaContactMs = 1800;
const cellMs = 1000 / 24;
const emberCellMs = 1000 / 30;

function cutsAt(
  cells: readonly number[],
  duration = cellMs,
): readonly number[] {
  return cells.map((cell) => shockKomaContactMs + cell * duration);
}

export const shockKomaVariants: readonly ShockKomaVariant[] = [
  {
    id: 'ink',
    name: '극단색과 먹선',
    description:
      '접촉을 극단색 1코마 → 명암 반전 1코마 → 거친 먹선 2코마로 교체하고 원색 장면으로 돌아옵니다.',
    distinction:
      '24fps 기준 4코마의 짧은 작화 교체입니다. 색면과 먹선의 면적 대비를 읽힙니다.',
    previewMs: 1905,
    beats: [
      { timeMs: 1818, label: '극단색 1코마' },
      { timeMs: 1860, label: '명암 반전 1코마' },
      { timeMs: 1905, label: '먹선 2코마' },
      { timeMs: 1980, label: '원색 복귀' },
    ],
    cuts: cutsAt([0, 1, 2, 4]),
    finishMs: shockKomaContactMs + cellMs * 4,
  },
  {
    id: 'embers',
    name: '섬광과 잔염',
    description:
      '발광 윤곽 → 적색 실루엣 → 백열 섬광 → 갈라지는 붉은 잔염 → 흑백 방사선으로 교체합니다.',
    distinction:
      '30fps 기준 25코마입니다. 고정한 정권 윤곽 위에서 전용 스프라이트 12장의 팽창과 소진을 읽힙니다.',
    previewMs: 2200,
    beats: [
      { timeMs: 1816, label: '발광 윤곽' },
      { timeMs: 1850, label: '적색 실루엣' },
      { timeMs: 1916, label: '백열핵' },
      { timeMs: 2200, label: '붉은 잔염' },
      { timeMs: 2566, label: '흑백 방사선' },
      { timeMs: 2666, label: '원색 복귀' },
    ],
    cuts: cutsAt(
      [
        0,
        1,
        2,
        3,
        4,
        ...Array.from({ length: 9 }, (_, i) => 5 + i * 2),
        22,
        25,
      ],
      emberCellMs,
    ),
    finishMs: shockKomaContactMs + emberCellMs * 25,
  },
  {
    id: 'whiteout',
    name: '백화 소거',
    description:
      '어두운 접촉 윤곽 → 빛에 씻긴 배우 → 윤곽까지 사라진 흰 판 → 희미한 윤곽의 재출현으로 잇습니다.',
    distinction:
      '빛을 앞에 얹는 대신 배우 그림 자체를 소거합니다. 1·1·2·3코마로 백색 여백을 읽힌 뒤 원색으로 돌아옵니다.',
    previewMs: shockKomaContactMs + cellMs * 2.5,
    beats: [
      { timeMs: shockKomaContactMs + cellMs * 0.5, label: '어두운 접촉 윤곽' },
      { timeMs: shockKomaContactMs + cellMs * 1.5, label: '형태가 빛에 씻김' },
      { timeMs: shockKomaContactMs + cellMs * 2.5, label: '윤곽까지 백화' },
      {
        timeMs: shockKomaContactMs + cellMs * 4.5,
        label: '희미한 윤곽 재출현',
      },
      { timeMs: shockKomaContactMs + cellMs * 7 + 12, label: '원색 복귀' },
    ],
    cuts: cutsAt([0, 1, 2, 4, 7]),
    finishMs: shockKomaContactMs + cellMs * 7,
  },
  {
    id: 'compression',
    name: '압축 파열',
    description:
      '타점으로 모이는 검은 압력면 → 눌린 백색핵 → 넓게 찢어지는 파열 → 끊긴 압력 조각으로 잇습니다.',
    distinction:
      '배우의 체형은 유지하고 압력 형상만 안으로 조였다 바깥으로 터뜨립니다. 1·1·2·2코마의 짧고 둔중한 충격입니다.',
    previewMs: shockKomaContactMs + cellMs * 2.5,
    beats: [
      { timeMs: shockKomaContactMs + cellMs * 0.5, label: '타점 압축' },
      { timeMs: shockKomaContactMs + cellMs * 1.5, label: '눌린 백색핵' },
      { timeMs: shockKomaContactMs + cellMs * 2.5, label: '넓은 파열' },
      { timeMs: shockKomaContactMs + cellMs * 4.5, label: '끊긴 압력 조각' },
      { timeMs: shockKomaContactMs + cellMs * 6 + 12, label: '원색 복귀' },
    ],
    cuts: cutsAt([0, 1, 2, 4, 6]),
    finishMs: shockKomaContactMs + cellMs * 6,
  },
  {
    id: 'brush',
    name: '일필 관통',
    description:
      '타점에 모인 가는 획 → 오른쪽으로 찢고 나가는 넓은 획 → 갈라진 관통 흔적 → 끊긴 잔획으로 잇습니다.',
    distinction:
      '불꽃과 발광 없이 불투명한 획의 폭과 끊김으로 한 번의 관통을 읽힙니다. 1·1·2·2코마 뒤 즉시 복귀합니다.',
    previewMs: shockKomaContactMs + cellMs * 1.5,
    beats: [
      { timeMs: shockKomaContactMs + cellMs * 0.5, label: '가는 압축획' },
      { timeMs: shockKomaContactMs + cellMs * 1.5, label: '찢긴 관통획' },
      { timeMs: shockKomaContactMs + cellMs * 2.5, label: '갈라진 흔적' },
      { timeMs: shockKomaContactMs + cellMs * 4.5, label: '끊긴 잔획' },
      { timeMs: shockKomaContactMs + cellMs * 6 + 12, label: '원색 복귀' },
    ],
    cuts: cutsAt([0, 1, 2, 4, 6]),
    finishMs: shockKomaContactMs + cellMs * 6,
  },
  {
    id: 'misregister',
    name: '색판 어긋남',
    description:
      '같은 접촉 그림의 청록·적색 판이 힘 방향으로 벌어졌다가 짧은 백색 접촉에서 맞물리고 한 윤곽으로 정착합니다.',
    distinction:
      '과거 자세의 잔상이나 장면 전체 색 필터 대신 같은 원화의 색판 위치만 어긋납니다. 1·1·1·3코마로 분리와 결합을 대비합니다.',
    previewMs: shockKomaContactMs + cellMs * 1.5,
    beats: [
      { timeMs: shockKomaContactMs + cellMs * 0.5, label: '색판 분리' },
      {
        timeMs: shockKomaContactMs + cellMs * 1.5,
        label: '힘 방향으로 벌어짐',
      },
      {
        timeMs: shockKomaContactMs + cellMs * 2.5,
        label: '백색 접촉에서 결합',
      },
      { timeMs: shockKomaContactMs + cellMs * 3.5, label: '한 윤곽으로 정착' },
      { timeMs: shockKomaContactMs + cellMs * 6 + 12, label: '원색 복귀' },
    ],
    cuts: cutsAt([0, 1, 2, 3, 6]),
    finishMs: shockKomaContactMs + cellMs * 6,
  },
  {
    id: 'halftone',
    name: '망점 붕괴',
    description:
      '접촉을 굵은 망점으로 인쇄 → 흑백 밀도 교체 → 타점에서 점 군집이 뜯겨 나감 → 드문 잔여 면으로 잇습니다.',
    distinction:
      '먹선 무늬를 얹는 대신 배우의 명암 면 자체를 점 군집으로 분해합니다. 1·1·2·2·2코마로 인쇄와 붕괴를 구분합니다.',
    previewMs: shockKomaContactMs + cellMs * 4.5,
    beats: [
      { timeMs: shockKomaContactMs + cellMs * 0.5, label: '굵은 망점 인쇄' },
      { timeMs: shockKomaContactMs + cellMs * 1.5, label: '흑백 밀도 교체' },
      {
        timeMs: shockKomaContactMs + cellMs * 2.5,
        label: '타점에서 군집 분리',
      },
      {
        timeMs: shockKomaContactMs + cellMs * 4.5,
        label: '점 군집이 뜯겨 나감',
      },
      { timeMs: shockKomaContactMs + cellMs * 6.5, label: '드문 잔여 면' },
      { timeMs: shockKomaContactMs + cellMs * 8 + 12, label: '원색 복귀' },
    ],
    cuts: cutsAt([0, 1, 2, 4, 6, 8]),
    finishMs: shockKomaContactMs + cellMs * 8,
  },
];

export function getShockKomaVariant(value: unknown): ShockKomaVariant {
  return (
    shockKomaVariants.find((variant) => variant.id === value) ??
    shockKomaVariants[0]!
  );
}
