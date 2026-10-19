import { bambooJourneyDefinition, bambooJourneySurface, bambooJourneyZone, } from './bamboo-journey-layout.js';
import { pineJourneyDefinition, pineJourneySurface, pineJourneyZone, } from './pine-journey-layout.js';
import { frostJourneyDefinition, frostJourneySurface, frostJourneyZone, } from './frost-journey-layout.js';
import { emberJourneyDefinition, emberJourneySurface, emberJourneyZone, } from './ember-journey-layout.js';
/** 같은 화면과 보행 규칙에 연결할 지역별 탐험 데이터만 모은다. */
export const regionalJourneys = {
    boar: {
        definition: pineJourneyDefinition,
        surface: pineJourneySurface,
        zone: pineJourneyZone,
        routeLabel: '산길·계곡 이어걷기',
        notice: '소나무 숲을 지나 석교를 건너보세요. 계곡 물가와 옛 벌목터를 살펴보고 바위고개로 향합니다.',
        description: '계곡을 따라 걷거나 벌목터 쪽으로 돌아보고, 연결 샛길로 지나온 풍경을 다시 만나보세요.',
    },
    bear: {
        definition: frostJourneyDefinition,
        surface: frostJourneySurface,
        zone: frostJourneyZone,
        routeLabel: '순례길·능선 이어걷기',
        notice: '눈 덮인 숲과 얼어붙은 계류를 지나보세요. 산장과 돌탑, 능선과 골짜기를 골라 북쪽 빙호로 향합니다.',
        description: '산장 우회와 귀환샛길을 오가고, 능선과 골짜기에서 다른 설산 풍경을 살펴보세요.',
    },
    armadillo: {
        definition: emberJourneyDefinition,
        surface: emberJourneySurface,
        zone: emberJourneyZone,
        routeLabel: '운반로·채석장 이어걷기',
        notice: '재 덮인 운반로에서 용암 균열의 돌다리를 찾아보세요. 채석장과 둘레 능선은 전장 앞에서 다시 만납니다.',
        description: '채석장과 관측길을 선택해 걷고, 귀환샛길로 옛 운반로와 작업 흔적을 다시 살펴보세요.',
    },
    mantis: {
        definition: bambooJourneyDefinition,
        surface: bambooJourneySurface,
        zone: bambooJourneyZone,
        routeLabel: '샛길 + 정원 이어걷기',
        notice: '깊은 대숲을 지나 개울을 건너보세요. 사당 우회로와 가로샛길은 물가정원에서 다시 만납니다.',
        description: '울창한 대숲에서 열린 연못으로 이어지는 풍경을 걷고, 징검길과 먼 물가를 골라 수련문 앞뜰로 향해보세요.',
    },
};
