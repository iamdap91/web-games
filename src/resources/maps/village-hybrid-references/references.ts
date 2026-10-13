export type HybridReference = {
  readonly id: string;
  readonly name: string;
  readonly target: string;
  readonly finding: string;
  readonly proposal: string;
  readonly check: string;
  readonly sources: readonly { readonly label: string; readonly url: string }[];
};

/** 확인한 제작 자료와 이 프로젝트에 대한 제안을 분리해서 보관한다. */
export const hybridReferences: readonly HybridReference[] = [
  {
    id: 'texture',
    name: '입체 표면에 픽셀 무늬',
    target: '벽돌 · 기와 · 나무결',
    finding:
      'Three.js는 확대와 축소 필터를 별도로 선택한다. 확대 Nearest는 픽셀 경계를 유지하지만, 밉맵 없이 축소하면 먼 무늬가 반짝일 수 있다.',
    proposal:
      '큰 건축 형태는 3D로 만들고 표면 무늬는 낮은 해상도 이미지로 구성한다. 벽과 지붕의 단위 길이당 도트 크기를 맞춘다.',
    check:
      '가까운 보행 화면과 전체 조망에서 무늬 크기 · 모서리 이음새 · 반짝임을 비교한다.',
    sources: [
      {
        label: 'Three.js · Textures',
        url: 'https://threejs.org/manual/pages/textures.html',
      },
    ],
  },
  {
    id: 'fixed-card',
    name: '건물에 고정한 그림',
    target: '간판 · 창살 · 천막 · 문패',
    finding:
      '카메라를 향하는 billboard는 본체와 교차할 수 있다. 카메라 방향에 고정한 이미지와 물체의 방향에 고정한 이미지는 서로 다른 역할을 가진다.',
    proposal:
      '간판과 창문 그림은 건물의 자식 평면으로 두고 벽면 방향을 따른다. 물체를 옮겨도 장식과 발밑이 함께 이동하게 한다.',
    check:
      '주 시점과 전체 조망에서 이미지가 벽을 뚫거나 붕 뜨는지 확인한다. 같은 면의 겹침은 작은 간격 또는 polygonOffset으로 처리한다.',
    sources: [
      {
        label: 'Three.js · Billboards',
        url: 'https://threejs.org/manual/pages/billboards.html',
      },
      {
        label: 'Three.js · Material',
        url: 'https://threejs.org/docs/pages/Material.html',
      },
    ],
  },
  {
    id: 'decal',
    name: '표면을 따라 붙이는 데칼',
    target: '바위의 이끼 · 얼룩 · 균열',
    finding:
      'DecalGeometry는 기존 메시 위에 작은 세부 그림을 투영한다. 공식 문서는 모서리를 넘는 투영에서 왜곡이 생길 수 있다고 설명한다.',
    proposal:
      '평평한 벽의 문패는 고정 평면으로 충분하다. 굴곡을 따라야 하는 이끼나 바위 흔적에만 투영 데칼을 검토한다.',
    check: '접합부 왜곡 · 표면 겹침 · 수정된 본체와의 위치 일치를 확인한다.',
    sources: [
      {
        label: 'Three.js · DecalGeometry',
        url: 'https://threejs.org/docs/pages/DecalGeometry.html',
      },
    ],
  },
  {
    id: 'foliage',
    name: '입체 줄기와 얇은 잎',
    target: '고사리 · 갈대 · 수풀 · 잎 덩어리',
    finding:
      'Three.js 투명성 예제는 서로 교차하는 평면의 정렬 문제를 다룬다. 잎이나 풀처럼 선명한 경계에서는 alphaTest가 빈 부분을 깊이 판정에서 제외하는 데 유용하다.',
    proposal:
      '줄기와 큰 수관은 입체 형태로 유지하고, 낮은 식생은 고정된 교차 평면에 제한한다. 모든 자연물을 카메라를 향하게 만들 필요는 없다.',
    check:
      '옆면의 얇아짐 · 인물 뒤 가림 · 투명 테두리 · 여러 판 사이의 틈을 보행하며 확인한다.',
    sources: [
      {
        label: 'Three.js · Transparency',
        url: 'https://threejs.org/manual/pages/transparency.html',
      },
    ],
  },
  {
    id: 'facade',
    name: '입체를 구운 방향별 그림',
    target: '먼 나무 · 원경 건축 · 반복 소품',
    finding:
      'Three.js 공식 facade 예제는 3D 나무를 RenderTarget에 그려 2D 이미지로 바꾼다. 여러 방향을 미리 그린 뒤 시점에 맞는 그림을 고르는 방식도 설명한다.',
    proposal:
      '가까이 걸어다니는 건물은 실제 입체를 유지하고, 원경 식생에는 이미지 대체를 검토한다. 기존 프리렌더 실험과 연결해 제작 가능성을 판단한다.',
    check:
      '방향 전환 때 튀는지 · 바닥 접점 · 복구 상태별 그림 수 · 가까이 접근했을 때의 평면성을 확인한다.',
    sources: [
      {
        label: 'Three.js · Billboards and Facades',
        url: 'https://threejs.org/manual/pages/billboards.html',
      },
    ],
  },
  {
    id: 'lighting',
    name: '2D 그림과 주변 빛의 조화',
    target: '화덕 주변 장식 · 인물 · 밤의 창문',
    finding:
      'MeshBasicMaterial은 조명 영향을 받지 않는다. Unity의 2D 조명 자료는 색 그림과 표면 방향(normal), 조명 영역(mask)을 분리하는 제작 원리를 설명한다.',
    proposal:
      '원본 아타호 그림은 보존한다. 주변 장식은 조명에 반응하는 재질이나 의도적인 색조 보정으로 공간에 맞춘다. 2D 배경에서는 벽과 바닥의 빛 영역을 구분해 합성할 수 있다.',
    check:
      '빛의 위치를 바꾸며 벽돌·기와의 요철 음영이 달라지는지 확인한다. 원본 인물의 색 보존, 그림과 normal의 UV 일치, 빛 영역 mask를 함께 비교한다.',
    sources: [
      {
        label: 'Three.js · MeshBasicMaterial',
        url: 'https://threejs.org/docs/pages/MeshBasicMaterial.html',
      },
      {
        label: 'Unity · Sprite normal / mask maps',
        url: 'https://docs.unity.com/en-us/engine/7000.0/manual/unity2d/2d-urp/2d-index/secondary-textures',
      },
    ],
  },
  {
    id: 'pixel-grid',
    name: '이미지와 입체의 도트 맞추기',
    target: '인물 · 바닥 · 장식 · 카메라 이동',
    finding:
      'ProPixelizer 제작 문서는 입체를 도트로 그릴 때 이동 중 픽셀 점유와 정렬 변화로 반짝임이 생기는 pixel creep을 설명한다. 정사영에서 렌더 위치를 픽셀 격자에 맞추는 해법을 제시한다.',
    proposal:
      '게임의 이동 상태와 화면 표시의 격자 보정을 분리한다. 배경 전체를 픽셀화하는 후보에서는 발밑 위치와 인물 그림의 도트 크기를 함께 확인한다.',
    check:
      '정지 화면뿐 아니라 대각선 보행 · 카메라 추적 · 전체 조망 전환 · DPR 2에서 안정성을 본다.',
    sources: [
      {
        label: 'ProPixelizer · Eliminating Pixel Creep',
        url: 'https://propixelizer.github.io/docs/usage/eliminate-pixel-creep/',
      },
    ],
  },
  {
    id: 'background-depth',
    name: '그림 배경과 인물의 깊이 가림',
    target: '프리렌더 마을 · 지붕 뒤 보행 · 고정 시점',
    finding:
      'RenderTarget은 장면을 화면 밖의 버퍼에 그려 색 이미지로 보관한다. DepthTexture는 같은 렌더의 깊이를 이미지로 저장한다. 정지된 배경 그림과 깊이 정보를 함께 사용할 수 있다.',
    proposal:
      '고정 시점 마을은 배경 색과 가림 정보를 미리 만들고 움직이는 인물·시설을 합성한다. 복구·조망·화면 크기가 바뀌면 배경을 다시 만든다. 구현 난도에 따라 깊이 이미지 또는 입체의 깊이 판정을 선택한다.',
    check:
      '지붕 뒤에 선 인물이 가려지는지 · 바닥과 인물의 접점 · 조망 전환 및 DPR 2에서 색과 깊이의 좌표가 일치하는지 확인한다. 실제 성능 개선은 별도 측정하며, 원작 FANTASIAN의 내부 구현과 동일하다는 뜻은 아니다.',
    sources: [
      {
        label: 'Three.js · RenderTarget',
        url: 'https://threejs.org/docs/pages/RenderTarget.html',
      },
      {
        label: 'Three.js · DepthTexture',
        url: 'https://threejs.org/docs/pages/DepthTexture.html',
      },
    ],
  },
  {
    id: 'material-layers',
    name: '색 그림과 표면 성질 나누기',
    target: '나무껍질 · 이끼 · 종이 · 금속 장식',
    finding:
      'Three.js의 색 map과 normal·bump·roughness map은 서로 다른 정보를 담는다. normal과 bump는 조명이 보이는 방향을 바꾸지만 실제 외곽 형태는 바꾸지 않는다. 표면 데이터는 색 공간 변환을 적용하지 않는다.',
    proposal:
      '큰 뿌리와 접힌 벽은 입체로 만들고, 껍질 홈이나 종이 섬유는 별도 표면 정보로 표현한다. 간판 그림은 벽의 자식으로 두고 재질만 달리하면 한 물체 안에 서로 다른 소재를 섞을 수 있다.',
    check:
      '유기적인 외곽선은 실제 형태로 남았는지, 가까운 빛에서 요철 방향이 맞는지, 작은 그림과 큰 본체의 질감 밀도가 어울리는지 본다.',
    sources: [
      {
        label: 'Three.js · MeshStandardMaterial',
        url: 'https://threejs.org/docs/pages/MeshStandardMaterial.html',
      },
    ],
  },
  {
    id: 'curved-placement',
    name: '휘어진 지형과 그림의 접점',
    target: '곡선 지평선 · 인물 발 · 건물 장식 · 그림자',
    finding:
      'Three.js는 custom shader로 정점 위치를 바꿀 수 있다. 정점을 바꾸는 메시가 그림자를 드리울 때는 같은 변형을 customDepthMaterial에도 반영해야 한다고 공식 문서가 설명한다.',
    proposal:
      '곡률은 배경만의 효과로 끝내지 않고 건물·장식·인물 발 위치에도 같은 기준을 적용한다. 게임의 평평한 보행 좌표와 화면의 곡면 좌표를 분리하고 클릭 역변환도 같은 함수를 사용한다.',
    check:
      '멀어질 때 인물이 땅 위로 뜨는지, 문패가 벽에서 떨어지는지, 그림자와 클릭 목적지가 지형에 붙는지 확인한다. Animal Crossing의 내부 구현을 재현했다는 뜻은 아니다.',
    sources: [
      {
        label: 'Three.js · ShaderMaterial',
        url: 'https://threejs.org/docs/pages/ShaderMaterial.html',
      },
      {
        label: 'Three.js · Object3D customDepthMaterial',
        url: 'https://threejs.org/docs/pages/Object3D.html',
      },
    ],
  },
  {
    id: 'stepped-motion',
    name: '그림과 입체 움직임의 박자',
    target: '모형 간판 · 종이 연기 · 시설 복구',
    finding:
      'Phonopolis의 제작자 소개는 손으로 칠한 판지 조각을 디지털화한 3D 세계와 전통적인 12 FPS 애니메이션을 설명한다.',
    proposal:
      '이 프로젝트에서는 직접 작성한 재질과 단계별 포즈로 모형 느낌을 비교한다. 입력과 충돌 계산은 연속으로 유지하고, 장식과 연기의 표시 포즈만 같은 박자로 갱신한다.',
    check:
      '표시 박자가 느려도 보행 입력이 늦어지지 않는지, 정지 포즈 사이에서 그림 판이 본체와 어긋나지 않는지, 멈춤이 표시 시간까지 고정하는지 본다.',
    sources: [
      {
        label: 'Amanita Design · Phonopolis 제작 소개',
        url: 'https://store.steampowered.com/app/1206070/Phonopolis/',
      },
    ],
  },
];

export const villageStyleLinks = [
  {
    id: 'natural',
    name: '도트화한 3D 자연마을',
    method: '입체 지형 · 통일된 명암 · 낮은 식생 카드',
    reference: 'A Short Hike',
    url: 'https://ashorthike.com/',
  },
  {
    id: 'pixel2d',
    name: '2D 도트 생활마을',
    method: '2D 픽셀 그림 · 발밑 깊이 정렬 · 영역별 화덕 빛',
    reference: 'Sea of Stars / Eastward',
    url: 'https://seaofstarsgame.co/',
  },
  {
    id: 'hd2d',
    name: 'HD-2D 계단마을',
    method: '입체 건축 · 픽셀 표면 · 벽에 고정된 장식',
    reference: 'Octopath Traveler II',
    url: 'https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style?lang=ko-kr',
  },
  {
    id: 'voxel',
    name: '복셀풍 작은 마을',
    method: '각진 입체 덩어리 · 얇은 2D 장식 · 시설 변화',
    reference: 'The Touryst',
    url: 'https://thetouryst.shinen.com/deluxe/',
  },
  {
    id: 'paper',
    name: '종이골목 · 팝업북 마을',
    method: '세워진 그림 판 · 접힌 지붕 · 겹친 골목과 종이 가장자리',
    reference: 'Paper Mario: The Thousand-Year Door',
    url: 'https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/Paper-Mario-The-Thousand-Year-Door-2445545.html',
  },
  {
    id: 'painted',
    name: '빛바랜 광장 · 회화풍 마을',
    method: '붓터치와 큰 명암 · 비대칭 광장 · 그림 레이어의 앞뒤 가림',
    reference: 'Disco Elysium',
    url: 'https://discoelysium.com/media',
  },
  {
    id: 'toy',
    name: '동글 언덕 · 장난감 모형 마을',
    method: '둥근 건축 · 큰 색면 · 부드러운 그림자와 원형 순환길',
    reference: "The Legend of Zelda: Link's Awakening",
    url: 'https://zelda.nintendo.com/links-awakening/blog/director-yoshiki-haruhana/',
  },
  {
    id: 'diorama',
    name: '손길 마을 · 프리렌더 디오라마',
    method: '고정 시점의 입체 배경 이미지 · 깊이 가림 · 움직이는 인물과 시설',
    reference: 'FANTASIAN Neo Dimension',
    url: 'https://blog.playstation.com/2024/09/24/fantasian-neo-dimension-out-december-5-hironobu-sakaguchi-talks-bringing-his-rpg-to-ps5/',
  },
  {
    id: 'retro',
    name: '오래된 나루 · 레트로 3D 마을',
    method: '단순한 입체 · 작은 픽셀 텍스처 · 나루와 시장 골목',
    reference: 'Crow Country',
    url: 'https://blog.playstation.com/2024/05/02/crow-country-retro-original-playstation-era-gameplay-stylings-meet-modern-horror/',
  },
  {
    id: 'line',
    name: '색돌이 마을 · 선화와 색칠책',
    method: '굵은 선 · 간결한 색 · 시설 복구로 돌아오는 마을의 색',
    reference: 'Chicory: A Colorful Tale',
    url: 'https://chicorygame.com/',
  },
  {
    id: 'side',
    name: '옆길 마을 · 횡스크롤 거리',
    method: '측면 상점 거리 · 지붕길과 뒷골목 · 서로 다른 속도의 전후경',
    reference: 'Night in the Woods',
    url: 'https://finji.itch.io/night-in-the-woods',
  },
  {
    id: 'cutaway',
    name: '열린 집들 · 단면 마을',
    method: '외벽을 잘라 보이는 실내 · 층간 계단 · 작업장과 숙소',
    reference: 'Fallout Shelter',
    url: 'https://fallout.bethesda.net/en/games/fallout-shelter',
  },
  {
    id: 'collage',
    name: '뿌리 둥지 · 자연 콜라주',
    method: '거대한 유기적 외곽선 · 껍질과 이끼 질감 · 얇은 식생 그림',
    reference: 'Samorost 3',
    url: 'https://amanita-design.net/games/samorost3.html',
  },
  {
    id: 'modular',
    name: '이어진 골목 · 연결형 모듈',
    method: '인접 건물에 반응하는 벽과 지붕 · 연결 아치와 마당',
    reference: 'Townscaper',
    url: 'https://www.townscapergame.com/',
  },
  {
    id: 'limited',
    name: '두빛 마을 · 제한색 도트',
    method: '제한색과 디더링 · 실루엣으로 읽는 픽셀 거리',
    reference: 'Minit / Return of the Obra Dinn',
    url: 'https://devolverdigital.itch.io/minit',
  },
  {
    id: 'horizon',
    name: '둥근 길 · 곡선 지평선',
    method: '휘어진 지형과 접점 · 걷는 동안 펼쳐지는 원경',
    reference: 'Animal Crossing: New Horizons',
    url: 'https://www.nintendo.com/en-gb/Games/Nintendo-Switch-games/Animal-Crossing-New-Horizons-1438623.html',
  },
  {
    id: 'stopmotion',
    name: '손끝 골목 · 스톱모션 모형',
    method: '거친 손칠 재질 · 단계별 장식 포즈 · 모형 시설 변화',
    reference: 'Phonopolis',
    url: 'https://store.steampowered.com/app/1206070/Phonopolis/',
  },
  {
    id: 'lit2d',
    name: '불빛 골목 · 조명 반응 도트',
    method: '색 그림과 표면 방향 분리 · 이동하는 빛에 반응하는 픽셀 요철',
    reference: 'Unity의 2D normal / mask 제작 원리',
    url: 'https://docs.unity.com/en-us/engine/7000.0/manual/unity2d/2d-urp/2d-index/secondary-textures',
  },
  {
    id: 'mixed-dojo',
    name: '온빛 도장 · 입체·자연·회화 조합',
    method:
      'HD2D 입체 건축 · 자연 지형과 굽은 길 · 큰 회화 명암 · 표면 방향 조명',
    reference: 'Three.js · 색 그림과 표면 방향',
    url: 'https://threejs.org/docs/pages/MeshStandardMaterial.html',
  },
  {
    id: 'mixed-forest',
    name: '이끼 품은 둥지 · 자연입체·콜라주 조합',
    method: '실제 입체 뿌리와 버섯집 · 껍질·이끼 소재 그림 · 고정 식생 판',
    reference: 'Three.js · 투명 식생과 깊이',
    url: 'https://threejs.org/manual/pages/transparency.html',
  },
  {
    id: 'mixed-diorama',
    name: '붓결이 머무는 마당 · 디오라마·회화·콜라주 조합',
    method:
      '큰 회화 명암과 소재 그림 · 입체 배경의 색·깊이 캐시 · 움직이는 인물과 시설',
    reference: 'Three.js · 배경 렌더와 깊이',
    url: 'https://threejs.org/docs/pages/DepthTexture.html',
  },
  {
    id: 'mixed-growth',
    name: '살아나는 골목 · 연결건축·단면생활 조합',
    method:
      '인접 규칙으로 바뀌는 건축 · 같은 성장 상태의 실내와 생활 · 외벽 단면 비교',
    reference: 'Three.js · 건물과 장식의 부모 자식 배치',
    url: 'https://threejs.org/docs/pages/Object3D.html',
  },
  {
    id: 'lived-dojo',
    name: '온기 도는 도장 · 실내생활·복구 조합',
    method:
      '자연 입체 마을 · 접근할 때 보이는 실내 · 복구와 연결된 생활과 통행',
    reference: '온빛 도장 / 살아나는 골목 / 개울 골목',
    url: '../village-style-lived-dojo/',
  },
  {
    id: 'living-diorama',
    name: '저녁이 깃든 마당 · 디오라마·생활 조합',
    method: '색·깊이 배경 합성 · 낮과 저녁 · 시설에 반응하는 주민과 생활 소품',
    reference: '붓결이 머무는 마당 / 개울 골목',
    url: '../village-style-living-diorama/',
  },
  {
    id: 'root-expedition',
    name: '포자길 답사 · 숲·발견·귀환 조합',
    method: '굴곡 뿌리와 이끼 · 조사로 열리는 연결길 · 다른 길로 귀환과 재방문',
    reference: '이끼 품은 둥지 / 원정 지도 답사',
    url: '../village-style-root-expedition/',
  },
  {
    id: 'lit-street',
    name: '등불 아래 거리 · 횡스크롤·실내 조합',
    method: '횡측면 거리와 패럴랙스 · 생활 공간의 단면 · 표면 방향 조명',
    reference: '옆길 마을 / 열린 집들 / 불빛 골목',
    url: '../village-style-lit-street/',
  },
  {
    id: 'popup-book',
    name: '펼쳐지는 책 속 마을 · 종이·모형·조립 조합',
    method: '얇은 종이 힌지 · 12fps 조립 · 완성 후 두 다리와 마당 연결',
    reference: '종이골목 / 손끝 골목 / 이어진 골목',
    url: '../village-style-popup-book/',
  },
  {
    id: 'window-village',
    name: '창빛 이어지는 마을 · 픽셀·조명·실내 조합',
    method: '픽셀 실외와 같은 가구·주민의 실내 · 문 출입 · 창빛 표면 조명',
    reference: '개울 골목 / 불빛 골목 / 열린 집들',
    url: '../village-style-window-village/',
  },
  {
    id: 'color-restoration',
    name: '색과 길을 되찾는 마을 · 선화·복구·증축 조합',
    method: '구역별 선화와 색 · 복구 완료 후 다리·방·복도 생성',
    reference: '색돌이 마을 / 살아나는 골목',
    url: '../village-style-color-restoration/',
  },
  {
    id: 'horizon-harbor',
    name: '지평선 너머 나루 · 곡면·생활 조합',
    method: '원통 지평선과 자연 언덕 · 바다 경계와 부두 · 준비/신호/귀환',
    reference: '둥근 길 / 산들 마을 / 해풍나루',
    url: '../village-style-horizon-harbor/',
  },
] as const;

/** 통합 화면의 실제 입력과 렌더 검토를 마친 조합 기록이다. */
export const reviewedMixedVillages = [
  {
    id: 'popup-book',
    previousStyles: ['paper', 'stopmotion', 'modular'],
    finding:
      '제본 공방과 종이 도장에서 건축과 두 다리를 2.4초씩 펼친다. 조립 완료 전에는 통행이 막히고 완료 후 세 마당을 실제로 걷는다. 조립 표시 박자는 12fps이며 원본 인물 보행은 연속으로 유지한다. 전망대 방문 뒤 실제 입구 진입으로 귀환을 판정한다.',
  },
  {
    id: 'window-village',
    previousStyles: ['pixel2d', 'lit2d', 'cutaway'],
    finding:
      '위에서 내려다보는 마을의 창 구멍과 실내는 같은 가구·주민 좌표와 생활 시간을 사용한다. 공방의 열쇠를 받아 수련당을 고치고 개울 다리 건너 찻집에 들어간다. 문은 순간이동 없이 걸어서 통과하며 수동 출입에서도 벽 띠에 갇히지 않는다.',
  },
  {
    id: 'color-restoration',
    previousStyles: ['line', 'mixed-growth'],
    finding:
      '가까운 공방을 복구하면 서쪽만 채색되고 첫 다리가 생긴다. 실제로 다리를 건너 찻집을 복구해야 동쪽 색과 방·문·복도·귀환 다리가 열린다. 새 방 방문과 다른 다리 통과 뒤 걸어서 귀환하며 순간 입구 복귀는 완료로 집계하지 않는다.',
  },
  {
    id: 'horizon-harbor',
    previousStyles: ['horizon', 'natural'],
    finding:
      '원통 곡면에 자연 언덕·서로 다른 나루 시설·부두와 배를 함께 배치한다. 시장과 보급 준비를 창고에 전달하면 부두 종과 돛이 반응한다. 바다는 통행할 수 없고 실제 연결된 부두를 걸으며 항구를 발견한다. 촘촘히 분할한 부두 바닥과 원본 인물의 발·클릭 역변환을 맞춘다.',
  },

  {
    id: 'lived-dojo',
    previousStyles: ['mixed-dojo', 'mixed-growth', 'pixel2d'],
    finding:
      '문앞에서 도장을 복구하면 지붕과 내부 수련 생활, 동쪽 뒤문 통행이 함께 바뀐다. 가까이 걸을 때 주요 도장의 지붕과 앞벽만 걷히고 수련 마루·빨래마당·쉼터로 이어진다. 실제 5개 장소 방문과 뒤문 통과, 입구 복귀의 진행 보존을 확인했다.',
  },
  {
    id: 'living-diorama',
    previousStyles: ['mixed-diorama', 'pixel2d'],
    finding:
      '색·깊이 배경에 공방 작업·도장 수련·천 펼치기·빨래와 천막을 동적으로 합성했다. 낮/저녁 전환은 배경을 다시 굽지만 보행과 작업 시간은 캐시를 재사용한다. 네 시설 방문 뒤 걸어서 귀환하고, 복구 후 저녁 도장 창빛과 정지 중 고정된 Canvas를 확인했다.',
  },
  {
    id: 'root-expedition',
    previousStyles: ['mixed-forest'],
    finding:
      '처음 끊긴 뿌리를 돌아 쉼터를 발견하고 직접 조사하면 연결 뿌리가 자란다. 발견만으로는 길이 열리지 않고 성장 완료 뒤 실제 새 길을 통과한다. 포자 안내를 따라 다른 방향으로 걸어서 귀환하고 재방문에도 개방과 발견 기록을 유지한다.',
  },
  {
    id: 'lit-street',
    previousStyles: ['side', 'cutaway', 'lit2d'],
    finding:
      '서로 다른 속도로 움직이는 거리 전후경에 공방·도장·2층 여관의 단면을 결합했다. 같은 계단 연결로 클릭과 직접 보행이 층을 이동하며 시설 입장 뒤 풀무·수리·수련·차가 반응한다. 표면 높이장에서 만든 normal과 이동 램프의 내적·거리 감쇠로 픽셀 명암을 계산한다.',
  },
  {
    id: 'mixed-dojo',
    previousStyles: ['hd2d', 'natural', 'painted', 'lit2d'],
    finding:
      '입체 계단·건축 위에 굽은 흙길과 비대칭 광장, 큰 붓 색면을 조합했다. 계단과 지형이 겹치던 부분을 고쳤고 중앙 계단·언덕 우회·도장 뒤 가림을 확인했다. 높이장의 원리는 실제 3D normal로 옮겨 광원 위치와 요철 비교에서 벽돌·기와의 음영이 바뀐다.',
  },
  {
    id: 'mixed-forest',
    previousStyles: ['natural', 'collage', 'lit2d'],
    finding:
      '기존 2D 소재판을 실제 굴곡 뿌리·두꺼운 줄기·버섯집의 UV와 고정 이끼 판으로 옮겼다. 노출 껍질 길과 이끼 가장자리, 둥근 옆면을 분리해 넓은 녹색 판 인상을 개선했다. 두 갈래 높이 보행·줄기 도장·이끼 뒤 쉼터와 국소 조명의 표면 반응을 확인했다.',
  },
  {
    id: 'mixed-diorama',
    previousStyles: ['diorama', 'painted', 'collage', 'lit2d'],
    finding:
      '비껴난 높은 도장·낮은 천시장·꺾인 수로를 새로 배치하고 회화 명암과 소재 결을 입체 UV에 붙였다. 색·깊이 캐시의 보행 중 재사용과 복구·빛·normal·시점·크기 변경 때의 갱신, 지붕 뒤 가림을 확인했다. 정적 조명은 배경에 굽고 동적 불꽃·국소 색판은 별도로 합성한다.',
  },
  {
    id: 'mixed-growth',
    previousStyles: ['modular', 'cutaway', 'lit2d'],
    finding:
      '방 2·3·4개와 공유 벽 0·2·3쌍이 한 성장 상태에서 실내 생활·통행·연결 지붕을 함께 바꾼다. 외벽을 열어도 방문·복구·성장은 유지된다. 원본 인물과 주민의 축척을 맞추고 높은 숙소 바닥에 맞춰 벽·지붕도 높였다. 새 벽이 생긴 위치는 가까운 통행점으로 보정하고, 계단 위 쉼터·작업 반응·귀환을 확인했다.',
  },
] as const;
