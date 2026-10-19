import { rushClimaxMs } from './choreography.js';
import { finaleSourceStartMs, finaleReadyLocalMs, finaleCrossLocalMs, finaleContactLocalMs, presentedRushDurationMs, presentedStillMs, } from './finale-timing.js';
export { sceneWidth, sceneHeight } from '../shared/playback.js';
export const prisonStartMs = 3300;
const strikeStartMs = prisonStartMs + rushClimaxMs;
const stillStartMs = prisonStartMs + presentedStillMs;
const readyStartMs = prisonStartMs + finaleSourceStartMs + finaleReadyLocalMs;
const crossStartMs = prisonStartMs + finaleSourceStartMs + finaleCrossLocalMs;
const endingStartMs = prisonStartMs + presentedRushDurationMs;
const returnStartMs = endingStartMs + 2370;
export const cuts = [
    { id: 'stage', label: '대치', startMs: 0, endMs: 900 },
    { id: 'eyes', label: '시선', startMs: 900, endMs: 2050 },
    { id: 'threat', label: '호기', startMs: 2050, endMs: 3300 },
    {
        id: 'prison',
        label: '암중 공방',
        startMs: prisonStartMs,
        endMs: strikeStartMs,
    },
    {
        id: 'strike',
        label: '결정타',
        startMs: strikeStartMs,
        endMs: readyStartMs,
        previewMs: 420,
    },
    {
        id: 'encircle',
        label: '지상 포위',
        startMs: readyStartMs,
        endMs: crossStartMs,
        previewMs: 80,
    },
    {
        id: 'crossing',
        label: '교차 강습',
        startMs: crossStartMs,
        endMs: stillStartMs,
        previewMs: finaleContactLocalMs - finaleCrossLocalMs + 30,
    },
    { id: 'still', label: '정적', startMs: stillStartMs, endMs: endingStartMs },
    {
        id: 'ending',
        label: '종결',
        startMs: endingStartMs,
        endMs: returnStartMs,
        previewMs: 1150,
    },
    {
        id: 'return',
        label: '귀환',
        startMs: returnStartMs,
        endMs: returnStartMs + 1050,
    },
];
export const durationMs = cuts[cuts.length - 1].endMs;
export { CutscenePlayer, unit, ease } from '../shared/playback.js';
