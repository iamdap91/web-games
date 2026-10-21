import { SceneTiming } from '../../cutscenes/scene-timing.js';
import { combinationTimingProfiles } from './timing.js';
import { journeyCuts } from './journey-cuts.js';
import { arenaCuts } from './arena-cuts.js';
import { flatCuts } from './flat-cuts.js';
import { speedImpactCuts } from './speed-impact-cuts.js';
import { actionSynergyCuts } from './action-synergy-cuts.js';
import { combinationVariantGroups, resolveCombinationSelection, } from './combination-variants.js';
import { finishMatte } from './drawing.js';
const all = [...journeyCuts, ...arenaCuts, ...flatCuts];
const order = [
    'background-run',
    'already-cut',
    'falling-background',
    'aerial-pursuit',
    'spiral-stairs',
    'bullet-counter',
];
const descriptions = {
    'background-run': '낮은 사선 카메라와 배경 스미어를 같은 질주에 묶고 끝 스퍼트에서 빠르게 도약한다. 착지 뒤 짧게 접촉을 받아 곰왕을 방출하고 어퍼컷 회수를 드러낸다.',
    'already-cut': '가속 반주 뒤 세 코마와 여섯 잔상으로 관통한다. 잔상을 걷은 정적 뒤 여덟 지연 타격이 몸을 밀고, 팔의 긴장을 풀어 잔심을 남긴다.',
    'falling-background': '협곡의 나선 추적 낙하를 빠르게 쌓고 마지막 가속에서 내려찍기를 뽑는다. 접촉 뒤 곧바로 착지하며, 기존 점프 원본을 회전한 낙하와 보유 내려찍기 원화를 사용한다.',
    'aerial-pursuit': '어퍼컷으로 띄운 뒤 잽·정권 네 타의 준비와 급신전·추격을 대비한다. 마지막 급강하의 타점 앞에서 흐림을 걷고, 접촉·착지로 힘을 마무리한다.',
    'spiral-stairs': '난간 없는60칸의 하이·근접·로우 구도를 빠르게 잇는다. 도약의 흐림과 속도선을 접촉 전에 걷어 공중 내려찍기와 빠른 꼭대기 착지를 선명하게 남긴다.',
    'bullet-counter': '곰왕 공격을 뛰어넘고 세계가 느려지는 동안103° 궤도를 돈다. 반격의 주먹과 카메라가 함께 급신전해 명중에서 멈춘 뒤 반동과 가속 착지로 정착한다.',
    'orbit-2d': '초반 시차를 읽힌 뒤 반주 중간을 빠르게 지나 반대편 구도로 정착한다. 장전 뒤 서쪽 어퍼컷을 짧게 뽑고 곰왕이 빠르게 밀렸다 돌아온다. 방향별 원화와 깊이 정렬을 유지한다.',
    'time-stop': '반전 파문 뒤 세계를 고정하고 다섯 자리로 이동한다. 등을 돌린 정적과 색 귀환 뒤 지연 타격을 좁은 간격으로 터뜨리고 착지·잔광을 정리한다.',
    'ink-one-stroke': '먹 번짐과 실루엣의 정적 뒤 붓 한 획을 가속해 뽑는다. 주먹과 획이 같은 진행량에서 닿고, 빠른 밀림·46가닥 비백·낙관 뒤 같은 획에서 색이 돌아온다.',
    'comic-panels': '눈·곰왕·디딤발·주먹 칸의 간격을 좁히며 한 타를 준비한다. 큰 칸 뒤 짧은 가속 신전으로 주먹·피격·판 어긋남·의성어가 함께 터지고 한 장의 만화로 멈춘다.',
};
function retimeCut(cut) {
    const profile = combinationTimingProfiles[cut.id];
    if (!profile)
        throw new Error(`조합의 재생 시간표가 없습니다: ${cut.id}`);
    const timing = new SceneTiming(cut.duration * 1000, profile);
    return {
        ...cut,
        timing,
        description: descriptions[cut.id] ?? cut.description,
        duration: timing.durationMs / 1000,
        beats: cut.beats.map((beat) => ({
            ...beat,
            label: beat.label.replace(/ · (34→50|32→58)m\/s/g, ''),
            time: timing.toPresentation(beat.time * 1000) / 1000,
        })),
        draw: (ctx, frame) => cut.draw(ctx, {
            ...frame,
            time: Math.max(0, Math.min(cut.duration - 0.3, timing.toSource(frame.time * 1000) / 1000)),
        }),
    };
}
export const cuts = [
    ...order
        .map((id) => all.find((c) => c.id === id))
        .filter((c) => !!c),
    ...flatCuts,
    ...speedImpactCuts,
    ...actionSynergyCuts,
].map(retimeCut);
function requiredCut(id) {
    const cut = cuts.find((entry) => entry.id === id);
    if (!cut)
        throw new Error(`조합의 바리에이션이 없습니다: ${id}`);
    return cut;
}
export const cutTypes = cuts
    .filter((cut) => resolveCombinationSelection(cut.id).id === cut.id)
    .map((cut) => ({
    id: cut.id,
    title: cut.title,
    variants: combinationVariantGroups
        .find((group) => group.id === cut.id)
        ?.variantIds.map(requiredCut) ?? [cut],
}));
export function findCutSelection(id, variant) {
    const selection = resolveCombinationSelection(id, variant);
    const type = cutTypes.find((entry) => entry.id === selection.id);
    if (!type)
        return undefined;
    return {
        type,
        cut: type.variants.find((cut) => cut.id === selection.variant) ??
            type.variants[0],
    };
}
export function drawCut(c, cut, frame) {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.clearRect(0, 0, 1280, 720);
    c.fillStyle = '#0b1923';
    c.fillRect(0, 0, 1280, 720);
    cut.draw(c, frame);
    finishMatte(c);
    c.restore();
}
