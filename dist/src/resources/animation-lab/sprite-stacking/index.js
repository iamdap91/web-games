import { registerEmbeddedScene } from '../../catalog/embedded-scene.js';
import { CartYard } from './cart-yard.js';
import { createCartSlices } from './slices.js';
import { createSliceImages, unproject, YardView } from './yard-view.js';
function element(selector) {
    const found = document.querySelector(selector);
    if (!found)
        throw new Error(`요소를 찾을 수 없습니다: ${selector}`);
    return found;
}
const canvas = element('.scene > canvas');
const context = canvas.getContext('2d');
if (!context)
    throw new Error('Canvas2D를 사용할 수 없습니다.');
const drawingContext = context;
const sliceCanvas = element('#slice');
const sliceContext = sliceCanvas.getContext('2d');
if (!sliceContext)
    throw new Error('단면 표시를 초기화할 수 없습니다.');
const sliceDrawingContext = sliceContext;
const asset = createCartSlices();
const images = createSliceImages(asset);
const view = new YardView(asset);
const yard = new CartYard();
const events = new AbortController();
const signal = events.signal;
const keys = new Set();
const driveButtons = new Set();
let target = null;
let pointerId = null;
let paused = false;
let autoRotate = false;
let flat = false;
let spacing = 0;
let headingOffset = 0;
let disposed = false;
let previousTime = 0;
let frameId = 0;
let logicalScale = 1;
let xOffset = 0;
let yOffset = 0;
const pauseButton = element('#pause');
const rotateButton = element('#rotate');
const flatButton = element('#flat');
const spacingInput = element('#spacing');
const layerInput = element('#layer');
const telemetry = element('#telemetry');
const delivery = element('#delivery');
function resize() {
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(bounds.width * dpr);
    canvas.height = Math.round(bounds.height * dpr);
    logicalScale = Math.min(bounds.width / 960, bounds.height / 530);
    xOffset = (bounds.width - 960 * logicalScale) / 2;
    yOffset = (bounds.height - 530 * logicalScale) / 2;
    drawingContext.setTransform(dpr * logicalScale, 0, 0, dpr * logicalScale, dpr * xOffset, dpr * yOffset);
    drawingContext.imageSmoothingEnabled = false;
}
const observer = new ResizeObserver(resize);
observer.observe(canvas);
resize();
function showSlice() {
    const layer = Number(layerInput.value);
    sliceDrawingContext.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    sliceDrawingContext.imageSmoothingEnabled = false;
    const image = images[layer];
    if (image)
        sliceDrawingContext.drawImage(image, 0, 0, 152, 112);
    element('#layer-value').value =
        `${layer + 1} / ${images.length}`;
}
showSlice();
layerInput.addEventListener('input', showSlice, { signal });
spacingInput.addEventListener('input', () => {
    spacing = Number(spacingInput.value);
    element('#spacing-value').value = spacing.toFixed(1);
}, { signal });
pauseButton.addEventListener('click', () => {
    paused = !paused;
    pauseButton.textContent = paused ? '계속 재생' : '일시정지';
}, { signal });
rotateButton.addEventListener('click', () => {
    autoRotate = !autoRotate;
    rotateButton.setAttribute('aria-pressed', String(autoRotate));
}, { signal });
flatButton.addEventListener('click', () => {
    flat = !flat;
    flatButton.setAttribute('aria-pressed', String(flat));
}, { signal });
element('#reset').addEventListener('click', () => {
    yard.reset();
    target = null;
    keys.clear();
    driveButtons.clear();
    headingOffset = 0;
    paused = false;
    pauseButton.textContent = '일시정지';
}, { signal });
element('#download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(asset)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wood-cart-horizontal-slices.json';
    link.click();
    URL.revokeObjectURL(url);
}, { signal });
element('#download-png').addEventListener('click', () => {
    const sheet = document.createElement('canvas');
    sheet.width = asset.width * 6;
    sheet.height = asset.depth * 5;
    const sheetContext = sheet.getContext('2d');
    if (!sheetContext)
        return;
    images.forEach((image, index) => sheetContext.drawImage(image, (index % 6) * asset.width, Math.floor(index / 6) * asset.depth));
    const link = document.createElement('a');
    link.href = sheet.toDataURL('image/png');
    link.download = 'wood-cart-27-slices-38x28-6-columns.png';
    link.click();
}, { signal });
function isInputTarget(event) {
    return event.target instanceof HTMLInputElement;
}
window.addEventListener('keydown', (event) => {
    if (isInputTarget(event))
        return;
    const key = event.key.toLowerCase();
    if (![
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        'w',
        's',
        'a',
        'd',
    ].includes(key))
        return;
    event.preventDefault();
    keys.add(key);
    target = null;
}, { signal });
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()), { signal });
window.addEventListener('blur', () => {
    keys.clear();
    driveButtons.clear();
    target = null;
}, { signal });
function pointerTarget(event) {
    const bounds = canvas.getBoundingClientRect();
    target = unproject({
        x: (event.clientX - bounds.left - xOffset) / logicalScale,
        y: (event.clientY - bounds.top - yOffset) / logicalScale,
    });
}
canvas.addEventListener('pointerdown', (event) => {
    canvas.focus();
    pointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    pointerTarget(event);
}, { signal });
canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointerId)
        pointerTarget(event);
}, { signal });
function releasePointer(event) {
    if (event.pointerId !== pointerId)
        return;
    if (canvas.hasPointerCapture(event.pointerId))
        canvas.releasePointerCapture(event.pointerId);
    pointerId = null;
    target = null;
}
canvas.addEventListener('pointerup', releasePointer, { signal });
canvas.addEventListener('pointercancel', releasePointer, { signal });
for (const button of document.querySelectorAll('[data-drive]')) {
    const direction = button.dataset.drive;
    if (!direction)
        continue;
    button.addEventListener('pointerdown', (event) => {
        button.setPointerCapture(event.pointerId);
        driveButtons.add(direction);
        target = null;
    }, { signal });
    const release = () => driveButtons.delete(direction);
    button.addEventListener('pointerup', release, { signal });
    button.addEventListener('pointercancel', release, { signal });
    button.addEventListener('lostpointercapture', release, { signal });
}
function held(key, alternate, button) {
    return Number(keys.has(key) || keys.has(alternate) || driveButtons.has(button));
}
function animate(time) {
    if (disposed)
        return;
    const seconds = previousTime
        ? Math.min((time - previousTime) / 1000, 0.05)
        : 0;
    previousTime = time;
    if (!paused) {
        yard.step(seconds, {
            forward: held('arrowup', 'w', 'forward') - held('arrowdown', 's', 'back'),
            turn: held('arrowright', 'd', 'right') - held('arrowleft', 'a', 'left'),
        }, target);
        if (autoRotate)
            headingOffset += seconds * 0.6;
    }
    const state = yard.snapshot();
    view.draw(drawingContext, state, { flat, spacing, headingOffset });
    const degrees = Math.round((state.pitch * 180) / Math.PI);
    telemetry.textContent = `${flat ? '평면 1장' : '27층 스태킹'} · 경사 ${degrees}° · ${Math.round(Math.abs(state.speed))}px/s`;
    delivery.textContent = `배달 ${state.deliveries}회 · ${state.loaded ? '짐을 오른쪽 창고로' : '왼쪽으로 돌아와 다시 싣기'}`;
    canvas.dataset.x = state.x.toFixed(1);
    canvas.dataset.pitch = state.pitch.toFixed(3);
    canvas.dataset.deliveries = String(state.deliveries);
    frameId = requestAnimationFrame(animate);
}
frameId = requestAnimationFrame(animate);
function dispose() {
    if (disposed)
        return;
    disposed = true;
    cancelAnimationFrame(frameId);
    observer.disconnect();
    events.abort();
    if (pointerId !== null && canvas.hasPointerCapture(pointerId))
        canvas.releasePointerCapture(pointerId);
    keys.clear();
    driveButtons.clear();
    target = null;
}
window.addEventListener('pagehide', dispose, { once: true, signal });
registerEmbeddedScene(dispose);
