/** 실행 모듈의 위치를 기준으로 저장소 하위 경로를 보존한다. */
export function resourceUrl(path, moduleUrl = import.meta.url) {
    return new URL(path.replace(/^\//, ''), new URL('../../../../', moduleUrl));
}
