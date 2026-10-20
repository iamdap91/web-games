import { journeyCuts } from './journey-cuts.js';
import { arenaCuts } from './arena-cuts.js';
import { flatCuts } from './flat-cuts.js';
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
export const cuts = [
    ...order
        .map((id) => all.find((c) => c.id === id))
        .filter((c) => !!c),
    ...flatCuts,
];
export function drawCut(c, cut, frame) {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.clearRect(0, 0, 1280, 720);
    c.fillStyle = '#0b1923';
    c.fillRect(0, 0, 1280, 720);
    cut.draw(c, {
        ...frame,
        time: Math.max(0, Math.min(cut.duration - 0.3, frame.time)),
    });
    finishMatte(c);
    c.restore();
}
