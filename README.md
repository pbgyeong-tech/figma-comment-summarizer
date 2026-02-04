# My Figma Plugin

TypeScript 기반 Figma 플러그인 보일러플레이트입니다.

## 프로젝트 구조

```
Figma-Plugin/
├── manifest.json      # Figma 플러그인 매니페스트
├── ui.html           # 플러그인 UI
├── src/
│   └── code.ts       # 플러그인 메인 로직 (TypeScript)
├── dist/             # 빌드 결과물 (자동 생성)
│   └── code.js
├── package.json      # npm 패키지 설정
├── tsconfig.json     # TypeScript 설정
└── README.md
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 빌드

```bash
npm run build
```

### 3. 개발 모드 (파일 변경 감지)

```bash
npm run watch
```

## Figma에서 플러그인 로드하기

1. Figma Desktop 앱을 엽니다.
2. 파일을 열거나 새 파일을 생성합니다.
3. 메뉴에서 **Plugins > Development > Import plugin from manifest...** 를 선택합니다.
4. 이 프로젝트의 `manifest.json` 파일을 선택합니다.
5. 플러그인이 로드되면 **Plugins > Development > My Figma Plugin** 에서 실행할 수 있습니다.

## 기능

현재 이 플러그인은 다음 기능을 포함하고 있습니다:

- 지정한 개수만큼 사각형 생성
- 각 사각형에 그라데이션 색상 적용
- 생성된 사각형 자동 선택 및 뷰포트 이동

## 커스터마이징

### 플러그인 정보 변경

`manifest.json` 파일에서 플러그인 이름과 ID를 수정하세요:

```json
{
  "name": "Your Plugin Name",
  "id": "your-unique-plugin-id"
}
```

### UI 수정

`ui.html` 파일에서 플러그인의 UI를 수정할 수 있습니다.

### 로직 수정

`src/code.ts` 파일에서 플러그인의 동작을 수정할 수 있습니다.

## 참고 자료

- [Figma Plugin API 문서](https://www.figma.com/plugin-docs/)
- [Figma Plugin Samples](https://github.com/figma/plugin-samples)
