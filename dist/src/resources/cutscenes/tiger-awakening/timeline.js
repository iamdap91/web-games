export const attackStartMs = 3450;
export const impactMs = 3800;
export const impactHoldMs = 90;
export const cuts = [
    { id: 'eyes', label: '눈 클로즈업', startMs: 0, endMs: 950, previewMs: 420 },
    {
        id: 'stance',
        label: '낮은 준비',
        startMs: 950,
        endMs: 2050,
        previewMs: 550,
    },
    {
        id: 'spirit',
        label: '호랑이 형상',
        startMs: 2050,
        endMs: 3450,
        previewMs: 1000,
    },
    {
        id: 'slash',
        label: '지면 강타',
        startMs: attackStartMs,
        endMs: impactMs,
        previewMs: 330,
    },
    {
        id: 'battle',
        label: '지열 방사',
        startMs: impactMs,
        endMs: 5300,
        previewMs: 830,
    },
];
export const battleStartMs = cuts[4].startMs;
export const durationMs = cuts[4].endMs;
