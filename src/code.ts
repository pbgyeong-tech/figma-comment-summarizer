// Figma Plugin Main Code

// 플러그인 UI 표시
figma.showUI(__html__, { width: 320, height: 280 });

// UI에서 보낸 메시지 처리
figma.ui.onmessage = async (msg: { type: string; count?: number }) => {
  // 사각형 생성 요청
  if (msg.type === 'create-rectangles') {
    const count = msg.count || 5;
    const nodes: SceneNode[] = [];

    // Figma 폰트 로드 (텍스트 사용시 필요)
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

    for (let i = 0; i < count; i++) {
      // 사각형 생성
      const rect = figma.createRectangle();
      
      // 위치 및 크기 설정
      rect.x = i * 120;
      rect.y = 0;
      rect.resize(100, 100);
      
      // 색상 설정 (랜덤 색상)
      const hue = (i / count) * 360;
      rect.fills = [{
        type: 'SOLID',
        color: hslToRgb(hue / 360, 0.7, 0.6)
      }];
      
      // 모서리 둥글게
      rect.cornerRadius = 8;
      
      // 이름 설정
      rect.name = `Rectangle ${i + 1}`;
      
      // 현재 페이지에 추가
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }

    // 생성된 노드 선택
    figma.currentPage.selection = nodes;
    
    // 생성된 노드가 보이도록 뷰포트 이동
    figma.viewport.scrollAndZoomIntoView(nodes);

    // UI에 결과 메시지 전송
    figma.ui.postMessage({ 
      type: 'result', 
      text: `${count}개의 사각형이 생성되었습니다!` 
    });
  }

  // 플러그인 닫기
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};

// HSL to RGB 변환 함수
function hslToRgb(h: number, s: number, l: number): RGB {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r, g, b };
}

// 플러그인 취소시 처리
figma.on('close', () => {
  // 정리 작업이 필요하면 여기에 추가
});
