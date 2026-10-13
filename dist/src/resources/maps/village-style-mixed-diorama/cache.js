/** 화덕·인물·시간은 동적 층이므로 배경 재굽기 키에 포함하지 않는다. */
export function backgroundKey(state) {
    return `${state.width}x${state.height}/${state.overview}/${state.restored}/${state.light}/${state.normals}`;
}
