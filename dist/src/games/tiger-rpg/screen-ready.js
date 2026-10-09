/** 스타일 실패·종료를 포함해 화면 수명 안에서만 준비를 기다린다. */
export function waitForStylesheet(link, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted || link.sheet) {
            resolve();
            return;
        }
        const finish = (error) => {
            link.removeEventListener('load', loaded);
            link.removeEventListener('error', failed);
            signal.removeEventListener('abort', loaded);
            if (error)
                reject(error);
            else
                resolve();
        };
        const loaded = () => finish();
        const failed = () => finish(new Error('화면 스타일을 불러오지 못했어요. 다시 시도해 주세요.'));
        link.addEventListener('load', loaded, { once: true });
        link.addEventListener('error', failed, { once: true });
        signal.addEventListener('abort', loaded, { once: true });
    });
}
/** render() 뒤 실제 표시 기회를 기다린다. 숨긴 탭은 렌더 완료 상태로 반환하고 복귀 때 표시한다. */
export function waitForRenderedFrame(signal) {
    return new Promise((resolve) => {
        let frame = 0;
        let remaining = 2;
        const finish = () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('visibilitychange', schedule);
            signal.removeEventListener('abort', finish);
            resolve();
        };
        const schedule = () => {
            cancelAnimationFrame(frame);
            if (signal.aborted) {
                finish();
                return;
            }
            if (document.hidden) {
                finish();
                return;
            }
            frame = requestAnimationFrame(() => {
                remaining -= 1;
                if (remaining === 0)
                    finish();
                else
                    schedule();
            });
        };
        signal.addEventListener('abort', finish, { once: true });
        document.addEventListener('visibilitychange', schedule);
        schedule();
    });
}
