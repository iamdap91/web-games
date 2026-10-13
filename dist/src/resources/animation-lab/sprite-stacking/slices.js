export function createCartSlices() {
    const width = 38;
    const depth = 28;
    const layers = Array.from({ length: 27 }, (_, z) => Array.from({ length: width * depth }, (_, index) => {
        const x = (index % width) - 19;
        const y = Math.floor(index / width) - 14;
        // 네 바퀴의 원판을 z 높이별 수평 띠로 자른다.
        if (Math.abs(y) >= 10 &&
            Math.abs(y) <= 12 &&
            ((x + 10) ** 2 + (z - 5) ** 2 <= 25 ||
                (x - 10) ** 2 + (z - 5) ** 2 <= 25)) {
            if (z >= 4 &&
                z <= 6 &&
                (Math.abs(x + 10) <= 1 || Math.abs(x - 10) <= 1))
                return 7;
            return Math.abs(y) === 12 ? 6 : 5;
        }
        if (z === 5 && Math.abs(x) === 10 && Math.abs(y) <= 10)
            return 5;
        if (z >= 8 && z <= 10 && Math.abs(x) <= 15 && Math.abs(y) <= 9)
            return z === 10 ? 2 : 1;
        if (z >= 11 &&
            z <= 15 &&
            Math.abs(x) <= 15 &&
            Math.abs(y) <= 9 &&
            (Math.abs(x) === 15 || Math.abs(y) === 9))
            return z === 15 ? 3 : 1;
        if (z >= 9 && z <= 11 && x >= 15 && x <= 18 && Math.abs(y) === 6)
            return 3;
        // 세 개의 나무 상자. 테두리와 끈은 단면 자체에 담는다.
        const crates = [
            { x: -8, y: -3, top: 21, color: 8 },
            { x: 5, y: -3, top: 21, color: 9 },
            { x: -3, y: 5, top: 26, color: 8 },
        ];
        for (const crate of crates) {
            const dx = Math.abs(x - crate.x);
            const dy = Math.abs(y - crate.y);
            if (z >= 11 && z <= crate.top && dx <= 5 && dy <= 3) {
                if (dx === 5 || dy === 3 || z === crate.top)
                    return dx <= 1 ? 4 : 3;
                return dx <= 1 ? 4 : crate.color;
            }
        }
        return 0;
    }));
    return {
        width,
        depth,
        layers,
        palette: [
            '#00000000',
            '#694737',
            '#ae784e',
            '#e0ae70',
            '#688a85',
            '#272d35',
            '#4b5355',
            '#d4b788',
            '#b77949',
            '#8b5b40',
        ],
    };
}
