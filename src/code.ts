// Figma Plugin Main Code - Comment Summarizer
// Phase 1-1: 기본 로직 (UI ↔ 플러그인 통신, clientStorage 저장)
// Phase 1-2: Figma REST API 코멘트 조회

// 타입 정의
interface PluginMessage {
  type: string;
  figmaToken?: string;
  geminiKey?: string;
  range?: string;
  nodeId?: string;
  comments?: FigmaComment[];
  error?: string;
  commentId?: string;
  checked?: boolean;
  checkedStates?: Record<string, boolean>;
  fileKey?: string;
  fileUrl?: string;
}

interface FigmaComment {
  id: string;
  message: string;
  created_at: string;
  resolved_at: string | null;
  user: {
    handle: string;
    img_url: string;
  };
  client_meta?: {
    node_id?: string;
    node_offset?: { x: number; y: number };
  };
  order_id?: string;
}

// 상수
const STORAGE_KEYS = {
  FIGMA_TOKEN: 'FIGMA_TOKEN',
  GEMINI_KEY: 'GEMINI_KEY',
  LAST_CHECK_TIME: 'LAST_CHECK_TIME',
  CHECKED_COMMENTS: 'CHECKED_COMMENTS',
  FILE_KEY: 'FILE_KEY'
} as const;

// UI 초기화 (400x600 크기)
figma.showUI(__html__, {
  width: 400,
  height: 600,
  themeColors: true
});

// 플러그인 시작 시 저장된 설정 로드
async function loadSettings(): Promise<void> {
  try {
    const figmaToken = await figma.clientStorage.getAsync(STORAGE_KEYS.FIGMA_TOKEN);
    const geminiKey = await figma.clientStorage.getAsync(STORAGE_KEYS.GEMINI_KEY);
    const lastCheckTime = await figma.clientStorage.getAsync(STORAGE_KEYS.LAST_CHECK_TIME);

    // UI에 저장된 설정 전송
    figma.ui.postMessage({
      type: 'load-settings',
      figmaToken: figmaToken || '',
      geminiKey: geminiKey || '',
      lastCheckTime: lastCheckTime || null,
      hasSettings: !!(figmaToken && geminiKey)
    });
  } catch (error) {
    console.error('설정 로드 실패:', error);
    figma.ui.postMessage({
      type: 'load-settings',
      figmaToken: '',
      geminiKey: '',
      lastCheckTime: null,
      hasSettings: false
    });
  }
}

// API 키 저장
async function saveSettings(figmaToken: string, geminiKey: string): Promise<boolean> {
  try {
    await figma.clientStorage.setAsync(STORAGE_KEYS.FIGMA_TOKEN, figmaToken);
    await figma.clientStorage.setAsync(STORAGE_KEYS.GEMINI_KEY, geminiKey);

    return true;
  } catch (error) {
    console.error('설정 저장 실패:', error);
    return false;
  }
}

// 마지막 확인 시간 업데이트
async function updateLastCheckTime(): Promise<void> {
  const now = new Date().toISOString();
  await figma.clientStorage.setAsync(STORAGE_KEYS.LAST_CHECK_TIME, now);
}

// 코멘트 조회 요청 (UI에 API 호출 요청)
async function requestFetchComments(range: string): Promise<void> {
  // 파일 키 확인: figma.fileKey 또는 저장된 fileKey 사용
  let fileKey = figma.fileKey;
  if (!fileKey) {
    fileKey = await figma.clientStorage.getAsync(STORAGE_KEYS.FILE_KEY);
  }
  console.log('🔑 fileKey:', fileKey, '(figma.fileKey:', figma.fileKey, ')');

  if (!fileKey) {
    figma.ui.postMessage({
      type: 'fetch-error',
      error: 'Figma 파일 URL을 설정에서 입력해주세요.'
    });
    return;
  }

  // 저장된 토큰 가져오기
  const figmaToken = await figma.clientStorage.getAsync(STORAGE_KEYS.FIGMA_TOKEN);
  const lastCheckTime = await figma.clientStorage.getAsync(STORAGE_KEYS.LAST_CHECK_TIME);

  if (!figmaToken) {
    figma.ui.postMessage({
      type: 'fetch-error',
      error: 'Figma API 토큰을 먼저 설정해주세요.'
    });
    return;
  }

  // UI에 fetch 요청 보내기
  figma.ui.postMessage({
    type: 'fetch-comments-request',
    fileKey: fileKey,
    figmaToken: figmaToken,
    range: range,
    lastCheckTime: lastCheckTime || null
  });
}

// 노드의 소속 프레임 정보 조회 (그룹핑용)
function getNodeFrameInfo(nodeId: string): { frameName: string; frameId: string } | null {
  try {
    // 1차 시도: 원본 node_id 사용
    let node = figma.getNodeById(nodeId);

    // 2차 시도: node_id 형식 변환 ("1:234" → 다른 포맷)
    if (!node && nodeId.includes(':')) {
      // Figma REST API는 "페이지ID:노드ID" 형태, 그대로 사용해야 함
      // getNodeById가 null일 수 있는 이유: 다른 페이지, 삭제된 노드
      console.log(`  ⚠️ 노드 없음: ${nodeId}`);
      return null;
    }

    if (!node) {
      console.log(`  ⚠️ 노드 없음: ${nodeId}`);
      return null;
    }

    // 페이지 바로 아래 최상위 프레임/섹션까지 올라가기
    let current: BaseNode = node;
    while (current.parent && current.parent.type !== 'PAGE') {
      current = current.parent;
    }

    console.log(`  ✅ ${nodeId} → 프레임: "${current.name}" (${current.id})`);
    return {
      frameName: current.name,
      frameId: current.id
    };
  } catch (e) {
    console.log(`  ❌ 에러: ${nodeId}`, e);
    return null;
  }
}

// 노드로 뷰포트 이동 (딥링크)
function zoomToNode(nodeId: string): void {
  const node = figma.getNodeById(nodeId);
  if (node && 'x' in node) {
    figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
    figma.currentPage.selection = [node as SceneNode];
  }
}

// UI에서 보낸 메시지 처리
figma.ui.onmessage = async (msg: PluginMessage) => {
  switch (msg.type) {
    // API 키 저장 요청
    case 'save-api-keys':
      const success = await saveSettings(
        msg.figmaToken || '',
        msg.geminiKey || ''
      );

      figma.ui.postMessage({
        type: 'settings-saved',
        success,
        message: success ? 'API 키가 저장되었습니다!' : '저장에 실패했습니다.'
      });
      break;

    // 코멘트 조회 요청 (기간 변경 시)
    case 'date-range-changed':
      console.log('기간 변경:', msg.range);
      await requestFetchComments(msg.range || '24h');
      break;

    // UI에서 코멘트 조회 완료
    case 'comments-fetched':
      const comments = msg.comments || [];
      console.log(`✅ 코멘트 ${comments.length}개 조회 완료`);

      // 1단계: 부모 코멘트의 node_id → 프레임 정보 맵 구축
      const parentFrameMap: Record<string, { nodeId: string; frameName: string; frameId: string | null }> = {};
      comments.forEach((comment: any) => {
        if (comment.parent_id) return; // 답글은 건너뜀
        const nodeId = comment.client_meta?.node_id
          || comment.client_meta?.node_offset?.node_id
          || null;
        if (nodeId) {
          const frameInfo = getNodeFrameInfo(nodeId);
          parentFrameMap[comment.id] = {
            nodeId,
            frameName: frameInfo?.frameName || '기타',
            frameId: frameInfo?.frameId || null
          };
        }
      });

      console.log(`🔍 부모 코멘트 ${Object.keys(parentFrameMap).length}개에서 프레임 매핑 완료`);

      // 2단계: 모든 코멘트에 프레임 정보 추가 (답글은 부모 정보 상속)
      const enrichedComments = comments.map((comment: any) => {
        // 직접 node_id가 있는 경우
        let nodeId = comment.client_meta?.node_id
          || comment.client_meta?.node_offset?.node_id
          || null;
        let frameName = '기타';
        let frameId = null;

        if (nodeId) {
          const frameInfo = getNodeFrameInfo(nodeId);
          frameName = frameInfo?.frameName || '기타';
          frameId = frameInfo?.frameId || null;
        } else if (comment.parent_id && parentFrameMap[comment.parent_id]) {
          // 답글: 부모 코멘트의 프레임 정보 상속
          const parent = parentFrameMap[comment.parent_id];
          nodeId = parent.nodeId;
          frameName = parent.frameName;
          frameId = parent.frameId;
        }

        return { ...comment, frameName, frameId, resolvedNodeId: nodeId };
      });

      // 체크 상태 로드
      const checkedStates = await figma.clientStorage.getAsync(STORAGE_KEYS.CHECKED_COMMENTS) || {};

      // 마지막 확인 시간 업데이트
      await updateLastCheckTime();

      // UI에 코멘트 데이터 + 체크 상태 전달
      figma.ui.postMessage({
        type: 'comments-loaded',
        comments: enrichedComments,
        count: enrichedComments.length,
        checkedStates: checkedStates
      });
      break;

    // UI에서 코멘트 조회 실패
    case 'comments-fetch-error':
      console.error('❌ 코멘트 조회 실패:', msg.error);
      figma.ui.postMessage({
        type: 'fetch-error',
        error: msg.error || '코멘트를 가져오는데 실패했습니다.'
      });
      break;

    // 마지막 확인 시간 업데이트
    case 'update-last-check':
      await updateLastCheckTime();
      break;

    // 체크 상태 저장
    case 'save-check-state':
      if (msg.commentId !== undefined) {
        const states = await figma.clientStorage.getAsync(STORAGE_KEYS.CHECKED_COMMENTS) || {};
        states[msg.commentId] = msg.checked;
        await figma.clientStorage.setAsync(STORAGE_KEYS.CHECKED_COMMENTS, states);
      }
      break;

    // 딥링크 (노드로 이동)
    case 'zoom-to-node':
      if (msg.nodeId) {
        zoomToNode(msg.nodeId);
      }
      break;

    // 파일 URL에서 fileKey 추출 후 저장
    case 'save-file-key':
      if (msg.fileKey) {
        await figma.clientStorage.setAsync(STORAGE_KEYS.FILE_KEY, msg.fileKey);
        figma.ui.postMessage({
          type: 'file-key-saved',
          fileKey: msg.fileKey
        });
      }
      break;

    // 플러그인 닫기
    case 'close':
      figma.closePlugin();
      break;
  }
};

// 플러그인 시작 시 설정 로드
loadSettings();

// 현재 파일 정보 전송
(async () => {
  let fileKey = figma.fileKey;
  if (!fileKey) {
    fileKey = await figma.clientStorage.getAsync(STORAGE_KEYS.FILE_KEY);
  }
  figma.ui.postMessage({
    type: 'file-info',
    fileKey: fileKey || null,
    fileName: figma.root.name
  });
})();
