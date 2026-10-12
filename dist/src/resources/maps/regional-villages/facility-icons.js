const paths = {
    inn: ['M3 18V10h18v8M3 14h18M6 10V7h6v5M3 18v3M21 18v3'],
    supply: ['M6 8h12l2 12H4L6 8Z', 'M8 8V5h8v3', 'M10 13h4'],
    warehouse: ['M4 6h16v14H4Z', 'M4 6l16 14M20 6L4 20'],
    market: ['M5 12c4-6 10-6 14 0-4 6-10 6-14 0Z', 'M5 12L2 8v8L5 12M15 10v.1'],
    smithy: ['M3 9h18l-4 5H8L3 9Z', 'M10 14v4H7v3h11v-3h-4v-4'],
    bath: [
        'M5 12v7h14v-7M3 12h18',
        'M7 8c-3-3 3-3 0-6M12 8c-3-3 3-3 0-6M17 8c-3-3 3-3 0-6',
    ],
    spring: [
        'M4 17c3-3 5 3 8 0s5 3 8 0',
        'M6 11c-3-3 3-3 0-6M12 11c-3-3 3-3 0-6M18 11c-3-3 3-3 0-6',
    ],
    fire: ['M12 3c1 5 6 6 6 11a6 6 0 0 1-12 0c0-3 3-5 4-8v5c2-2 2-5 2-8Z'],
    bell: ['M5 16h14l-2-4V9a5 5 0 0 0-10 0v3l-2 4Z', 'M10 20h4M12 2v2'],
    exit: ['M4 19V5h8M8 12h12M16 8l4 4-4 4'],
};
export function facilityPaths(id) {
    return paths[id] ?? paths.exit;
}
export function facilityIcon(id) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${facilityPaths(id)
        .map((path) => `<path d="${path}"/>`)
        .join('')}</svg>`;
}
