/** 독립 뷰어를 라이브러리 안에 표시할 때만 부모 화면과 수명을 연결한다. */
export const embeddedScene = new URLSearchParams(location.search).get('embed') === '1';
if (embeddedScene)
    document.documentElement.classList.add('embedded-scene');
export function registerEmbeddedScene(dispose) {
    if (!embeddedScene)
        return;
    const events = new AbortController();
    window.addEventListener('resource-scene-dispose', () => {
        events.abort();
        dispose();
    }, { once: true, signal: events.signal });
    window.addEventListener('pagehide', () => events.abort(), {
        once: true,
        signal: events.signal,
    });
}
export function reportEmbeddedSelection(assetId) {
    if (!embeddedScene)
        return;
    parent.postMessage({ type: 'resource-scene-selection', assetId }, location.origin);
}
