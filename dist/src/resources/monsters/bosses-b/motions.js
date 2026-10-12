import catalog from '../../../../resources/map-bosses-b-assets.json' with { type: 'json' };
import { readMovies } from './movie-parser.js';
import { startPreview } from './motion-player.js';
const select = document.getElementById('creature');
const status = document.getElementById('status');
if (!(select instanceof HTMLSelectElement) ||
    !(status instanceof HTMLParagraphElement))
    throw new Error('모션 화면 요소가 없습니다.');
const movies = readMovies(catalog);
const requested = new URL(location.href).searchParams.get('creature');
const chosen = movies.find((movie) => movie.id === requested) ?? movies[0];
if (chosen) {
    select.replaceChildren(...movies.map((movie) => new Option(movie.name, movie.id)));
    select.value = chosen.id;
    select.disabled = false;
    const events = new AbortController();
    select.addEventListener('change', () => {
        const url = new URL(location.href);
        url.searchParams.set('creature', select.value);
        location.assign(url);
    }, { signal: events.signal });
    window.addEventListener('pagehide', (event) => {
        if (!event.persisted)
            events.abort();
    }, { signal: events.signal });
    startPreview(chosen.id, 2);
}
else {
    status.textContent = '실제 다섯 모션이 준비된 개체부터 재생할 수 있습니다.';
}
