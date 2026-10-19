import savedPresets from '../../../../resources/ataho-v2-finisher-presets.json' with { type: 'json' };
import { resourceUrl } from '../../catalog/resource-url.js';
import { finisherOpacityDefaults } from './finisher-opacity.js';
import { inkImpactScaleRange } from './ink-impact-size.js';
export const presetDrawingFlags = [
    'showInkEffects',
    'directionalImpacts',
    'showGroundEffects',
    'showCameraRecoil',
    'showSpeedLines',
    'showFinisher',
    'showFinisherConcept',
    'showLocalCharge',
    'showFocusLines',
    'showDirectionalErosion',
    'showBetaFlash',
    'showFlowAccent',
    'showReleaseGlint',
    'showViscousOrbit',
    'showEffectHierarchy',
    'showGroundPuffs',
    'showFloorTrace',
    'showDepthLayers',
    'showReleaseKick',
    'showImpactLettering',
    'showEndSilhouette',
    'showBrushGlyph',
    'showActionFrame',
    'showCutin',
    'showErosion',
    'showKiLighting',
    'showErosionGlow',
    'showShockwave',
];
function record(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('설정 파일의 객체 형식이 올바르지 않아요.');
    return value;
}
function fields(value, keys) {
    if (Object.keys(value).length !== keys.length ||
        keys.some((key) => !(key in value)))
        throw new Error('설정 파일의 항목이 맞지 않아요.');
}
function textValue(value, max) {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
        throw new Error('설정 이름이나 식별자가 올바르지 않아요.');
    return value;
}
function booleanValue(value) {
    if (typeof value !== 'boolean')
        throw new Error('설정의 켜기·끄기 값이 올바르지 않아요.');
    return value;
}
function numberValue(value, min, max) {
    if (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < min ||
        value > max)
        throw new Error('설정의 숫자 범위가 올바르지 않아요.');
    return value;
}
function choiceValue(value, choices) {
    const choice = choices.find((item) => item === value);
    if (choice === undefined)
        throw new Error('지원하지 않는 설정값이 있어요.');
    return choice;
}
function parsePreset(value) {
    const item = record(value);
    fields(item, [
        'id',
        'name',
        'motionId',
        'presentationId',
        'supplement',
        'updatedAt',
        'drawing',
        'timing',
        'preview',
    ]);
    const drawing = record(item.drawing);
    fields(drawing, [
        ...presetDrawingFlags.filter((key) => key !== 'showViscousOrbit' || key in drawing),
        'inkTrailScale',
        ...('inkImpactScale' in drawing ? ['inkImpactScale'] : []),
        'legacyTrails',
        'cameraMode',
        'emphasisMode',
        'finisherOpacity',
        'enabledEffects',
    ]);
    const opacity = record(drawing.finisherOpacity);
    const opacityKeys = Object.keys(finisherOpacityDefaults);
    fields(opacity, opacityKeys);
    const enabledEffects = drawing.enabledEffects;
    if (!Array.isArray(enabledEffects) || enabledEffects.length > 100)
        throw new Error('동작 효과 목록이 올바르지 않아요.');
    const timing = record(item.timing);
    fields(timing, ['hitStop', 'hitStopShake', 'finalSlow']);
    const preview = record(item.preview);
    fields(preview, [
        'scale',
        'showMovement',
        'showContacts',
        'showSandbag',
        'speed',
        'repeat',
    ]);
    const updatedAt = textValue(item.updatedAt, 40);
    if (!Number.isFinite(Date.parse(updatedAt)))
        throw new Error('저장 시각이 올바르지 않아요.');
    const id = textValue(item.id, 64);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        throw new Error('저장 설정의 식별자가 올바르지 않아요.');
    return {
        id,
        name: textValue(item.name, 80).trim(),
        motionId: textValue(item.motionId, 120),
        presentationId: textValue(item.presentationId, 120),
        supplement: choiceValue(item.supplement, ['original', 'supplemented']),
        updatedAt,
        drawing: {
            ...Object.fromEntries(presetDrawingFlags.map((key) => [
                key,
                key === 'showViscousOrbit' && !(key in drawing)
                    ? true
                    : booleanValue(drawing[key]),
            ])),
            inkTrailScale: numberValue(drawing.inkTrailScale, 0, 20),
            inkImpactScale: 'inkImpactScale' in drawing
                ? numberValue(drawing.inkImpactScale, inkImpactScaleRange.min, inkImpactScaleRange.max)
                : inkImpactScaleRange.initial,
            legacyTrails: choiceValue(drawing.legacyTrails, [
                'none',
                'motion',
                'ink',
            ]),
            cameraMode: choiceValue(drawing.cameraMode, [
                'none',
                'preparation',
                'impact',
                'finish',
                'airborne',
                'tracking',
                'finisher',
            ]),
            emphasisMode: choiceValue(drawing.emphasisMode, [
                'none',
                'background',
                'palette',
                'impact',
            ]),
            finisherOpacity: Object.fromEntries(opacityKeys.map((key) => [key, numberValue(opacity[key], 0, 1)])),
            enabledEffects: enabledEffects.map((effect) => textValue(effect, 120)),
        },
        timing: {
            hitStop: booleanValue(timing.hitStop),
            hitStopShake: booleanValue(timing.hitStopShake),
            finalSlow: booleanValue(timing.finalSlow),
        },
        preview: {
            scale: choiceValue(preview.scale, [2, 3]),
            showMovement: booleanValue(preview.showMovement),
            showContacts: booleanValue(preview.showContacts),
            showSandbag: booleanValue(preview.showSandbag),
            speed: choiceValue(preview.speed, [0.25, 0.5, 1, 1.5, 2]),
            repeat: booleanValue(preview.repeat),
        },
    };
}
export function parseFinisherPresetDocument(value) {
    const document = record(value);
    fields(document, ['version', 'revision', 'presets']);
    if (document.version !== 1 ||
        !Number.isSafeInteger(document.revision) ||
        Number(document.revision) < 0)
        throw new Error('지원하지 않는 설정 파일 버전이에요.');
    if (!Array.isArray(document.presets) || document.presets.length > 200)
        throw new Error('저장 설정은 최대 200개까지 사용할 수 있어요.');
    const presets = document.presets.map((preset) => parsePreset(preset));
    if (new Set(presets.map((preset) => preset.id)).size !== presets.length)
        throw new Error('저장 설정의 식별자가 중복돼요.');
    return { version: 1, revision: Number(document.revision), presets };
}
/** 서버 문서의 revision을 유지해 다른 PC에서 갱신한 설정을 덮어쓰지 않는다. */
export class FinisherPresetRepository {
    signal;
    current = {
        version: 1,
        revision: 0,
        presets: [],
    };
    canWrite = false;
    endpoint = resourceUrl('api/ataho-v2-finisher-presets');
    constructor(signal) {
        this.signal = signal;
    }
    get document() {
        return this.current;
    }
    get writable() {
        return this.canWrite;
    }
    async load() {
        const response = await fetch(this.endpoint, {
            cache: 'no-store',
            signal: this.signal,
            headers: { 'X-Finisher-Presets': '1' },
        });
        if ([404, 405, 501].includes(response.status)) {
            this.current = parseFinisherPresetDocument(savedPresets);
            this.canWrite = false;
            return;
        }
        if (!response.ok)
            throw new Error('저장 목록을 읽지 못했어요. 잠시 뒤 새로고침해 주세요.');
        this.current = parseFinisherPresetDocument((await response.json()));
        this.canWrite = true;
    }
    async put(presets) {
        if (!this.canWrite)
            throw new Error('이 페이지에서는 저장 목록을 읽기만 할 수 있어요.');
        const next = parseFinisherPresetDocument({ ...this.current, presets });
        const response = await fetch(this.endpoint, {
            method: 'PUT',
            signal: this.signal,
            headers: {
                'Content-Type': 'application/json',
                'X-Finisher-Presets': '1',
            },
            body: JSON.stringify(next),
        });
        if (response.status === 409)
            throw new Error('다른 PC에서 저장 목록을 변경했어요. 목록 새로고침 후 다시 저장해 주세요.');
        if (!response.ok)
            throw new Error('설정을 저장하지 못했어요. 기존 저장 목록은 유지됩니다.');
        this.current = parseFinisherPresetDocument((await response.json()));
    }
}
export function finisherPresetSummary(preset) {
    const { drawing, timing } = preset;
    const mode = !drawing.showFinisher
        ? '필살기 연출 끔'
        : drawing.showFinisherConcept
            ? '기술별 컨셉'
            : '기본 연출';
    return [
        mode,
        `수묵 ${drawing.inkTrailScale}배`,
        `먹튀김 ${drawing.inkImpactScale}배`,
        `공격 농도 ${Math.round(drawing.finisherOpacity.attackTrail * 100)}%`,
        timing.hitStop ? (timing.hitStopShake ? '정지＋진동' : '명중 정지') : '',
        timing.finalSlow ? '결정타 슬로' : '',
    ]
        .filter(Boolean)
        .join(' · ');
}
