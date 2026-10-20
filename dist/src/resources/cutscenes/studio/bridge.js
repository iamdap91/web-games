import { studioSources, studioSourceDefinitions } from './sources.js';
import { resourceUrl } from '../../catalog/resource-url.js';
export const studioMode = new URLSearchParams(location.search).get('studio') === '1';
if (studioMode)
    document.documentElement.classList.add('studio-scene');
export function redirectToStudio(source) {
    if (studioMode)
        return false;
    const target = resourceUrl('src/resources/cutscenes/studio/');
    const old = new URL(location.href);
    const definition = studioSourceDefinitions.find((entry) => entry.source === source);
    const sampleId = definition.single
        ? definition.defaultSampleId
        : old.hash.slice(1) || definition.defaultSampleId;
    target.searchParams.set('item', `${source}:${sampleId}`);
    for (const key of ['embed', 'project', 'category', 'group', 'q']) {
        const value = old.searchParams.get(key);
        if (value)
            target.searchParams.set(key, value);
    }
    location.replace(target.href);
    return true;
}
export const isRecord = (value) => typeof value === 'object' && value !== null;
export function readCommand(data) {
    if (!isRecord(data) || typeof data.action !== 'string')
        return undefined;
    const { action, value } = data;
    if (action === 'toggle' ||
        action === 'restart' ||
        action === 'gif' ||
        action === 'png' ||
        action === 'cancel-export')
        return { action };
    if ((action === 'select' || action === 'facing') && typeof value === 'string')
        return { action, value };
    if ((action === 'seek' || action === 'speed') &&
        typeof value === 'number' &&
        Number.isFinite(value))
        return { action, value };
    if ((action === 'loop' || action === 'compare' || action === 'reduced') &&
        typeof value === 'boolean')
        return { action, value };
    return undefined;
}
function validSnapshot(value) {
    if (!isRecord(value) ||
        typeof value.itemId !== 'string' ||
        typeof value.title !== 'string' ||
        typeof value.description !== 'string' ||
        typeof value.playing !== 'boolean' ||
        typeof value.timeMs !== 'number' ||
        !Number.isFinite(value.timeMs) ||
        typeof value.durationMs !== 'number' ||
        !Number.isFinite(value.durationMs) ||
        value.durationMs <= 0 ||
        !Array.isArray(value.beats))
        return false;
    if (!value.beats.every((beat) => isRecord(beat) &&
        typeof beat.label === 'string' &&
        typeof beat.timeMs === 'number' &&
        Number.isFinite(beat.timeMs)))
        return false;
    for (const key of [
        'loading',
        'loop',
        'compare',
        'reducedMotion',
        'exporting',
    ])
        if (value[key] !== undefined && typeof value[key] !== 'boolean')
            return false;
    for (const key of ['facing', 'exportStatus'])
        if (value[key] !== undefined && typeof value[key] !== 'string')
            return false;
    if (value.facingOptions !== undefined &&
        (!Array.isArray(value.facingOptions) ||
            !value.facingOptions.every((option) => isRecord(option) &&
                typeof option.value === 'string' &&
                typeof option.label === 'string')))
        return false;
    return true;
}
const capabilityNames = [
    'loop',
    'compare',
    'facing',
    'reduced',
    'gif',
    'png',
    'cancelExport',
];
export function readStudioState(data) {
    if (!isRecord(data) ||
        data.type !== 'cutscene-studio-state' ||
        typeof data.source !== 'string' ||
        !studioSources.includes(data.source) ||
        !validSnapshot(data.state) ||
        !Array.isArray(data.capabilities) ||
        !data.capabilities.every((value) => typeof value === 'string' &&
            capabilityNames.includes(value)))
        return undefined;
    return data;
}
/** 시간은 기존 장면이 소유한다. 이 연결은 명령과 관찰값만 전달한다. */
export function connectStudioScene(source, controller) {
    if (!studioMode)
        return { dispose: () => { } };
    document.documentElement.dataset.studioSource = source;
    const events = new AbortController();
    let disposed = false;
    const capabilities = capabilityNames.filter((name) => typeof controller[name] === 'function');
    const publish = () => {
        if (disposed)
            return;
        parent.postMessage({
            type: 'cutscene-studio-state',
            source,
            state: controller.snapshot(),
            capabilities,
        }, location.origin);
    };
    const dispatch = (command) => {
        switch (command.action) {
            case 'toggle':
                controller.toggle();
                break;
            case 'restart':
                controller.restart();
                break;
            case 'seek':
                controller.seek(Math.max(0, command.value));
                break;
            case 'speed':
                if (command.value > 0 && command.value <= 4)
                    controller.speed(command.value);
                break;
            case 'select':
                controller.select(command.value);
                break;
            case 'loop':
                controller.loop?.(command.value);
                break;
            case 'compare':
                controller.compare?.(command.value);
                break;
            case 'facing':
                controller.facing?.(command.value);
                break;
            case 'reduced':
                controller.reduced?.(command.value);
                break;
            case 'gif':
                controller.gif?.();
                break;
            case 'png':
                controller.png?.();
                break;
            case 'cancel-export':
                controller.cancelExport?.();
                break;
        }
        publish();
    };
    window.addEventListener('message', (event) => {
        if (event.origin !== location.origin ||
            event.source !== parent ||
            !isRecord(event.data) ||
            event.data.type !== 'cutscene-studio-command')
            return;
        const command = readCommand(event.data.command);
        if (command)
            dispatch(command);
    }, { signal: events.signal });
    window.addEventListener('keydown', (event) => {
        if (event.target instanceof Element &&
            event.target.closest('input,select,textarea,button,a'))
            return;
        let command;
        if (event.code === 'Space' && !event.repeat)
            command = { action: 'toggle' };
        if (event.code === 'ArrowLeft' || event.code === 'ArrowRight')
            command = {
                action: 'seek',
                value: controller.snapshot().timeMs +
                    ((event.code === 'ArrowLeft' ? -1 : 1) *
                        (event.shiftKey ? 5 : 1) *
                        1000) /
                        24,
            };
        if (command) {
            event.preventDefault();
            event.stopImmediatePropagation();
            dispatch(command);
        }
        if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
            event.preventDefault();
            event.stopImmediatePropagation();
            parent.postMessage({
                type: 'cutscene-studio-step',
                direction: event.code === 'ArrowUp' ? -1 : 1,
            }, location.origin);
        }
    }, { capture: true, signal: events.signal });
    const timer = window.setInterval(publish, 80);
    const dispose = () => {
        if (disposed)
            return;
        disposed = true;
        clearInterval(timer);
        events.abort();
    };
    window.addEventListener('pagehide', dispose, {
        once: true,
        signal: events.signal,
    });
    queueMicrotask(publish);
    return { dispose };
}
