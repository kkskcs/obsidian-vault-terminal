# obsidian-vault-terminal 상세 스펙

## 1. 프로젝트 개요

### 프로젝트명
**obsidian-vault-terminal**

### 목적
옵시디언 Vault와 CLI 환경을 양방향으로 연계하여, 사용자가 편리하게 파일을 검색/실행/링크할 수 있는 터미널 플러그인. 액션 버튼 기반의 명령 자동화와 경로-링크 변환을 통해 워크플로우 효율성을 극대화.

### 핵심 철학
- **플러그인은 입출력 편의만 담당**: 실제 로직은 사용자 스크립트/Claude Code에 위임
- **Vault 중심**: 모든 경로 해석과 링크는 Vault를 루트로 설정
- **사용자 자유도**: 스크립트, 액션, 설정을 사용자가 완전히 제어 가능
- **명확한 책임**: 각 계층(플러그인, 스크립트, CLI)의 역할 분리

---

## 2. 주요 기능

### 2.1 기본 터미널

#### 2.1.1 렌더링
- **엔진**: xterm.js (MIT 라이선스)
- **쉘 연결**: Python helper 기반 PTY 브릿지
  - macOS/Linux: Python 표준 `pty` 모듈
  - Windows: Python + `pywinpty`
- **위치**: 옵시디언 중앙 노트 영역의 탭/분할
- **stdin/stdout**: xterm.js ↔ TypeScript PTY wrapper ↔ Python helper ↔ OS PTY
- **상단 고정 바**: 액션 버튼 툴바 (터미널 위쪽)

#### 2.1.2 쉘 자동 감지 (Shell Auto-detection)
- macOS/Linux: `process.env.SHELL` → zsh, bash, fish 등 사용자 기본 쉘 자동 사용
- Windows: `process.env.COMSPEC` → cmd.exe 또는 PowerShell
- dotfile(`.zshrc`, `.bashrc` 등) 로드 → PATH, alias, 환경변수가 일반 터미널과 동일
- 감지 실패 시 fallback: macOS/Linux → `/bin/bash`, Windows → `cmd.exe`

#### 2.1.3 테마/스타일
- **기본 테마**: xterm.js 내장 테마 (dark, light 등)
- **커스터마이즈**: 설정 파일에서 xterm.js ITerminalOptions 수정 가능
    - 폰트 크기, 색상, 커서 스타일 등
    - 예: `"terminalOptions": { "fontSize": 14, "lineHeight": 1.2 }`

#### 2.1.4 히스토리
- **자동 저장/복원**: 터미널 자체(bash/zsh)가 처리
- 플러그인 책임 X

#### 2.1.5 키보드 스코프 전환
- **문제**: 터미널 포커스 시 Obsidian 단축키(Ctrl+C, Ctrl+V 등)가 터미널 입력을 가로챔
- **해결**: `app.keymap.pushScope(scope)` / `popScope(scope)` 로 포커스/언포커스 시 키맵 스코프 교체
- 터미널 포커스 → Obsidian 단축키 비활성화, 터미널에 직접 전달
- 터미널 언포커스 → Obsidian 단축키 복원

---

### 2.2 액션 버튼 시스템

#### 2.2.1 상단 툴바 구조
```
┌──────────────────────────────────────────────────────────┐
│ 🔑 📜 🎨 ⛶ ⧉ | 📥 📤 ‖ 🔍 ⚙️ [사용자 정의...] →      │  ← 툴바
├──────────────────────────────────────────────────────────┤
│ $ _                                                      │
│                                                          │  ← xterm.js
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**시스템 버튼 (왼쪽 고정, 아이콘 + 툴팁)**
| 아이콘 | 기능 | 설명 |
|---|---|---|
| 🔑 | Env | 현재 주입된 환경변수 목록 팝업 |
| 📜 | History | 입력 히스토리 리스트 팝업 |
| 🎨 | Profile | 프로필(테마) 전환 |
| ⛶ | Fullscreen | 터미널 전체화면 전환 |
| ⧉ | New Window | 새 창으로 터미널 열기 |
| `\|` | (구분자) | |
| 📥 | Note → Terminal | 현재 노트 내용 / 선택 텍스트를 터미널 stdin으로 전송 |
| 📤 | Terminal → Note | 최근 터미널 출력을 현재 노트에 추가 |

**사용자 정의 버튼 (오른쪽, 가로 스크롤)**
- 설정 데이터의 툴바 구성 순서대로 렌더링
- 툴바는 action 버튼, divider, spacer를 순서대로 배치
- 버튼 수가 많을 경우 가로 스크롤
- 모든 버튼 아이콘 기반, 라벨은 hover 툴팁으로 표시
- 아이콘: Obsidian 내장 lucide 아이콘 사용 (`setIcon()` API)

#### 2.2.2 버튼 동작 흐름
1. 사용자 버튼 클릭
2. 해당 action의 `params`를 순서대로 resolve
3. `prompt` 입력이 필요한 경우 다이얼로그 표시
4. resolve된 값을 action `template`의 `{key}` 위치에 단순 문자열 치환
5. 최종 plain text를 PTY stdin으로 터미널에 전송

#### 2.2.3 다이얼로그 시스템
- **다이얼로그 타입**: 옵시디언 Modal (기본 UI)
- **필드 렌더링**: `type: "prompt"` 파라미터 개수만큼 입력 필드
- **각 필드**:
    - 라벨: 파라미터 key
    - 입력창: 텍스트 입력
    - Placeholder: 가이드 텍스트
    - 버튼: [Cancel] [OK]

---

### 2.3 Snippet & Action 실행 모델

#### 2.3.1 핵심 개념
- **Snippet**: 재사용 가능한 텍스트 템플릿
- **Action**: snippet / 파일 / 현재 노트 / 선택 텍스트 / prompt / 고정 텍스트를 조합해 최종 텍스트를 만드는 실행 단위
- **Toolbar**: action 버튼을 단순 나열하는 UI
- **플러그인 책임**: 입력 resolve, 문자열 치환, 터미널 stdin 전달
- **템플릿 책임**: 쉘 문법, quote, heredoc, AI CLI prompt 설계, 실행 로직은 action template에 명시

#### 2.3.2 Snippet 정의
```json
{
  "id": "wikilink-rule",
  "label": "Wikilink Rule",
  "description": "Ask AI tools to use Obsidian wikilinks.",
  "template": "파일 참조 시 Obsidian wikilink 형식으로 출력해 주세요."
}
```

- 기본 스니펫: 플러그인 내장, 수정 불가
- 커스텀 스니펫: `data.json`에 저장, 설정 UI에서 편집
- 스니펫은 action param의 `type: "snippet"`으로 참조

#### 2.3.3 Action 정의
```json
{
  "id": "claude-review",
  "label": "Claude Review",
  "icon": "bot",
  "variant": "claude",
  "template": "{rule}\n\nFile: {filePath}\n\n```\n{content}\n```\n\nRequest:\n{request}",
  "params": [
    { "key": "rule", "type": "snippet", "id": "wikilink-rule" },
    { "key": "filePath", "type": "currentFilePath" },
    { "key": "content", "type": "currentFileContent" },
    { "key": "request", "type": "prompt", "placeholder": "리뷰 요청 입력" }
  ],
  "echo": false
}
```

- `template`의 `{key}`는 같은 key를 가진 param resolve 결과로 단순 치환
- CLI 실행이 필요하면 action `template`에 쉘 명령으로 작성
- 최종 결과는 plain text이며 현재 터미널 stdin으로 전달

#### 2.3.4 Param 입력 타입
```typescript
type ActionParam =
  | { key: string; type: 'snippet'; id: string }
  | { key: string; type: 'filePath'; path: string }
  | { key: string; type: 'fileContent'; path: string }
  | { key: string; type: 'currentFilePath' }
  | { key: string; type: 'currentFileContent' }
  | { key: string; type: 'selectedText' }
  | { key: string; type: 'text'; content: string }
  | { key: string; type: 'prompt'; placeholder?: string };
```

#### 2.3.5 Action Group
- 그룹은 action을 분류하기 위한 상위 구조
- 같은 action을 여러 그룹에 포함할 수 있음

```json
{
  "id": "claude",
  "label": "Claude",
  "actionIds": ["claude-review"]
}
```

---

### 2.4 Wikilink 감지 및 렌더링

#### 2.4.1 지원 포맷
Obsidian 표준 wikilink 포맷만 지원:
```
[[linkpath]]
[[linkpath#heading]]
[[linkpath|alias]]
[[linkpath#heading|alias]]
```

- `linkpath`: Vault 내 파일 경로 또는 파일명
- `#heading`: 섹션 앵커 (선택)
- `alias`: 표시용 이름 (선택)
- 터미널 출력에서 감지 → 클릭 가능한 링크로 렌더링

#### 2.4.2 링크 해석 (Obsidian 위임)
플러그인이 직접 경로를 해석하지 않고 Obsidian API에 완전히 위임:
```typescript
app.workspace.openLinkText(linktext, '', false)
```
- `[[파일명]]` → Obsidian 설정의 "New link format"에 따라 파일 resolve
- 동일 파일명이 여러 폴더에 있을 경우 Obsidian 설정(shortest/relative/absolute) 기준으로 처리
- `#heading`/`|alias` 포함 모든 wikilink 형식 그대로 전달

#### 2.4.3 렌더링
- **엔진**: xterm.js `registerLinkProvider` API
- **좌표 보정**: `getCell().getWidth()`로 double-width 문자(한글, CJK, 이모지 등) 컬럼 보정
- **스타일**: 텍스트 전경색을 그대로 사용한 밑줄, 호버 시 포인터 커서
- **URL 클릭**: webviewer 내장 플러그인 활성화 시 Obsidian 탭으로 열기, 비활성화 시 외부 브라우저

#### 2.4.4 AI 출력 연동 가이드 (템플릿)
AI 도구(Claude Code, Aider 등)에 wikilink 포맷 출력을 지시하는 템플릿을 설정 UI에서 생성 가능:
- `app.vault.config.newLinkFormat` 값(shortest/relative/absolute) 자동 읽기
- 설정값에 맞는 wikilink 포맷 지시문 자동 생성
- 생성된 지시문은 복사하거나 system prompt / rules 파일에 추가 가능

예시 (shortest format):
```
파일 참조 시 [[파일명]] 형식의 Obsidian wikilink로 출력해 주세요.
섹션 링크는 [[파일명#섹션]], 별칭은 [[파일명|표시이름]] 형식을 사용하세요.
```

---

### 2.5 컨텍스트 활용

#### 2.5.1 현재 노트 컨텍스트 (Current Context)

**Action 예시:**
```json
{
  "id": "send-current-file",
  "label": "Send Current File",
  "template": "File: {filePath}\n\n{content}",
  "params": [
    { "key": "filePath", "type": "currentFilePath" },
    { "key": "content", "type": "currentFileContent" }
  ]
}
```

**동작:**
1. 플러그인이 현재 열려있는 노트 감지
2. 파일 경로 또는 파일 내용 자동 획득
3. action template의 `{filePath}`, `{content}`에 주입
4. 최종 텍스트를 터미널 stdin으로 전달

**사용 케이스:**
- 지금 보고 있는 노트의 관련 문서 검색
- 역링크 표시
- 같은 태그의 문서들 찾기

#### 2.5.2 선택된 텍스트 활용 (Selected Text)

**파라미터 옵션:**
```json
{ "key": "query", "type": "selectedText" }
```

**동작:**
1. 옵시디언에서 텍스트 선택
2. 버튼 클릭
3. 선택 텍스트 자동 획득 (editor.getSelectedText())
4. action template의 `{query}`에 주입
5. 최종 텍스트를 터미널 stdin으로 전달

**사용 케이스:**
- 선택한 단어를 검색 쿼리로 사용
- 선택한 경로를 파일로 열기
- 선택한 텍스트를 터미널에 입력

---

### 2.6 양방향 연계

#### 2.6.1 옵시디언 → 터미널

**Flow 1: 선택 텍스트 전송**
1. 옵시디언에서 텍스트 선택
2. 버튼 클릭 (예: [Send to Terminal])
3. 선택 텍스트 → PTY stdin으로 터미널 전송
4. 터미널에서 명령 실행

**Flow 2: 컨텍스트 활용**
- 현재 파일 경로 → 터미널 입력
- 현재 태그 → 검색 쿼리로 전송

#### 2.6.2 터미널 → 옵시디언

**Flow: 출력을 노트에 추가**
1. 터미널 명령 실행 (예: `ls -la`)
2. 버튼 클릭 ([Add to Note])
3. 최근 터미널 출력 (마지막 N줄) 캡처
4. 현재 노트 맨 아래 추가

**캡처 줄 수 설정:**
- 설정 데이터의 `addToNote.lines` 기본값: `200`
- 버튼 클릭 시 다이얼로그에서 줄 수 직접 입력 가능 (빈 값이면 기본값 사용)

**출력 포맷:**
````markdown
## Terminal Output (2026-04-24 10:30:45)
```vault-terminal profile=default
$ command
output...
```
````

- 코드블록 언어 태그: `vault-terminal` + `profile=<프로필명>`
- 프로필 테마 색상으로 렌더링됨 (아래 2.9 참고)

---

### 2.7 커맨드 팔레트 통합

**기능:**
- Ctrl+P (또는 Cmd+P) → 커맨드 팔레트 열기
- "vault-terminal" 검색 → 모든 액션 표시
- 선택 → 해당 액션 실행

**구현:**
```typescript
app.commands.addCommand({
  id: 'vault-terminal:find-files',
  name: 'Vault Terminal: Find Files',
  callback: () => { /* 액션 실행 */ }
});
```

**장점:**
- 버튼 없이도 액션 접근 가능
- 키보드만으로 완전 제어 가능

---

### 2.8 환경변수 주입

#### 2.8.1 동작
- PTY 프로세스 시작 시 `env` 옵션으로 환경변수 주입
- 쉘 dotfile 로드 이전에 주입되므로 스크립트/AI 툴에서 즉시 참조 가능

#### 2.8.2 기본 제공 Vault 환경변수
| 변수명 | 값 | 설명 |
|---|---|---|
| `VAULT_ROOT` | `/Users/.../obsidian` | Vault 절대경로 |

터미널 탭 열 때 1회 주입.

#### 2.8.3 사용자 정의 환경변수
설정 데이터에 추가 환경변수 정의 가능:
```json
{
  "env": {
    "MY_API_KEY": "...",
    "PROJECT": "my-project"
  }
}
```

#### 2.8.4 툴바 환경변수 리스트업
- 상단 툴바에 [Env] 버튼 → 현재 주입된 환경변수 전체 목록 팝업 표시
- Vault 기본 변수 + 사용자 정의 변수 모두 표시

---

### 2.9 프로필 테마 & 코드블록 렌더링

#### 2.9.1 프로필 정의
터미널 프로필별로 독립적인 테마 설정 가능. Obsidian 테마와 무관하게 동작.

```json
{
  "profiles": {
    "default": {
      "theme": {
        "background": "#1e1e1e",
        "foreground": "#d4d4d4",
        "cursor": "#d4d4d4",
        "black": "#000000",
        "red": "#cd3131",
        "green": "#0dbc79",
        "yellow": "#e5e510",
        "blue": "#2472c8",
        "magenta": "#bc3fbc",
        "cyan": "#11a8cd",
        "white": "#e5e5e5"
      }
    },
    "light": {
      "theme": {
        "background": "#ffffff",
        "foreground": "#383a42"
      }
    }
  }
}
```

#### 2.9.2 코드블록 렌더링
`registerMarkdownCodeBlockProcessor("vault-terminal", ...)` 로 등록.

노트 내 코드블록:
````
```vault-terminal profile=default
$ ls -la
total 48
drwxr-xr-x  8 user  staff   256 Apr 25 10:00 .
```
````

**렌더링 동작:**
- 지정한 프로필의 테마 색상(배경, 전경, ANSI 팔레트)을 CSS로 적용
- ANSI 이스케이프 시퀀스 파싱 → 색상/볼드 등 스타일 반영
- `profile` 미지정 시 `default` 프로필 사용
- PTY 없이 순수 정적 렌더링 (읽기 전용)

---

### 2.10 터미널 입력 히스토리

#### 2.10.1 개요
- PTY 입력을 플러그인이 직접 캡처하여 별도 관리
- Vault 내 파일로 저장 시 Obsidian Sync/git을 통해 기기간 자동 공유
- 설정하지 않으면 휘발성으로 동작 (기본)

#### 2.10.2 저장 모드 (선택)

| 모드 | 설정 | 동작 |
|---|---|---|
| 휘발성 | `history.mode: "none"` | 세션 종료 시 사라짐 (기본) |
| 단일 노트 | `history.mode: "note"` | 지정 노트에 누적, 최대 개수 유지 |
| 날짜별 롤링 | `history.mode: "daily"` | 지정 폴더에 `YYYY-MM-DD.md`로 일별 저장 |

#### 2.10.3 설정 예시
```json
{
  "history": {
    "mode": "daily",
    "folder": ".vault-terminal/history",
    "maxEntries": 1000
  }
}
```

- `mode: "note"` 시 `note` 필드로 노트 경로 지정
- `maxEntries`: 단일 노트 모드에서 최대 보관 개수 (초과 시 오래된 것부터 삭제)
- 날짜별 모드에서는 오래된 날짜 파일은 그대로 보존

#### 2.10.4 노트 포맷
```markdown
## 2026-04-25 10:30:00
```bash
find . -name "*.md"
```

## 2026-04-25 10:31:15
```bash
grep -r "keyword" .
```
```

#### 2.10.5 툴바 연동
- 상단 툴바 [History] 버튼 → 히스토리 리스트 팝업
- 클릭 시 해당 명령을 PTY stdin으로 전송
- 검색 지원

---

### 2.11 설정 UI (PluginSettingTab)

Obsidian 설정 탭에서 플러그인 전체 설정을 GUI로 관리. `data.json`에 저장되며 직접 편집은 필수가 아님.

#### Terminal 탭
- **터미널 옵션**: 폰트 크기, 줄 높이, 커서 스타일, 스크롤백 줄 수
- **프로필 관리**: 프로필 목록 / 추가 / 삭제 / 테마 색상 편집
- **기본 프로필**: 드롭다운으로 선택
- **환경변수**: 키-값 쌍 목록 / 추가 / 삭제
- **히스토리**: 저장 모드 선택 (none / note / daily), 폴더 경로, 최대 보관 수

#### Toolbar 탭
- **툴바 구성**
  - 사용자 정의 도구 버튼의 배치 편집
  - action / divider / spacer 형태를 지원
  - 런타임 렌더링은 등록된 action 버튼 목록을 기반으로 표시
  - 툴바 자체에는 그룹 기능을 두지 않고 단순 버튼 나열을 유지
- **액션 스타일**
  - `variant`로 버튼별 색상/외곽선 스타일 지정
  - 기본 쉘: `default`
  - Claude: `claude`
  - Codex: `codex`
  - Gemini: `gemini`
- **액션 관리**
  - 실행 가능한 버튼 단위
  - 편집 시: label, icon, variant, template, params, echo

#### Snippets 탭
- **스니펫 모델**
  - 재사용 가능한 텍스트 템플릿
  - 기본 스니펫은 플러그인 내장, 수정 불가
  - 커스텀 스니펫은 `data.json`에 저장하고 UI에서 편집
- **UI**
  - group별 expandable section
  - 빈 그룹은 "No snippets in this group." 안내만 표시
- **Action 연계**
  - action param의 `type: "snippet"`으로 스니펫을 참조
  - snippet 자체는 실행 단위가 아니며, action이 실행 단위

#### Runtime 탭
- **역할**
  - Python PTY backend 상태 진단
  - Python executable path 수동 입력
  - OS별 설치 가이드 링크 제공
- **Python 탐색 우선순위**
  1. Runtime 탭의 Python path
  2. `VAULT_TERMINAL_PYTHON`
  3. Windows: `py`
  4. macOS/Linux: `python3`
- **실패 UX**
  - 터미널 실행 실패 시 RuntimeRequiredDialog 표시
  - Runtime 설정 탭으로 이동하거나 README runtime setup guide를 열 수 있음

---

## 3. 설정 구조

### 3.1 설정 파일 위치
- **위치**: Obsidian plugin data store (`data.json`)
- **생성**: 플러그인 첫 저장 시 자동 생성
- **편집**: 일반적으로 설정 UI를 통해 관리

### 3.2 전체 설정 예시

```json
{
  "version": "1.0.0",
  "vaultRoot": true,
  "scriptFolder": ".vault-terminal/scripts",
  "runtime": {
    "pythonPath": "/usr/bin/python3"
  },
  "terminalOptions": {
    "fontSize": 14,
    "lineHeight": 1.2,
    "cursorStyle": "block",
    "scrollback": 1000
  },
  "profiles": {
    "default": {
      "theme": {
        "background": "#1e1e1e",
        "foreground": "#d4d4d4"
      }
    },
    "light": {
      "theme": {
        "background": "#ffffff",
        "foreground": "#383a42"
      }
    }
  },
  "defaultProfile": "default",
  "env": {
    "MY_VAR": "value"
  },
  "addToNote": {
    "lines": 200,
    "askLines": true
  },
  "history": {
    "mode": "daily",
    "folder": ".vault-terminal/history",
    "maxEntries": 1000
  },
  "snippets": [
    {
      "id": "wikilink-rule",
      "label": "Wikilink Rule",
      "description": "Ask AI tools to use Obsidian wikilinks.",
      "template": "파일 참조 시 Obsidian wikilink 형식으로 출력해 주세요."
    }
  ],
  "actions": [
    {
      "id": "claude-review",
      "label": "Claude Review",
      "icon": "bot",
      "variant": "claude",
      "template": "{rule}\n\nFile: {filePath}\n\n```\n{content}\n```\n\nRequest:\n{request}",
      "params": [
        { "key": "rule", "type": "snippet", "id": "wikilink-rule" },
        { "key": "filePath", "type": "currentFilePath" },
        { "key": "content", "type": "currentFileContent" },
        { "key": "request", "type": "prompt", "placeholder": "리뷰 요청 입력" }
      ],
      "echo": false
    },
    {
      "id": "find-files",
      "label": "Find Files",
      "icon": "search",
      "variant": "default",
      "template": "find . -name {pattern}\n",
      "params": [
        { "key": "pattern", "type": "prompt", "placeholder": "예: *.md" }
      ],
      "echo": true
    }
  ],
  "actionGroups": [
    { "id": "ai", "label": "AI", "actionIds": ["claude-review"] },
    { "id": "shell", "label": "Shell", "actionIds": ["find-files"] }
  ],
  "toolbar": [
    "claude-review",
    "find-files"
  ]
}
```

### 3.3 주요 설정 항목

| 항목 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `vaultRoot` | bool | true | Vault를 경로 루트로 설정 |
| `scriptFolder` | string | `.vault-terminal/scripts` | 사용자 스크립트 폴더 |
| `runtime` | object | `{}` | Python PTY runtime 설정 |
| `terminalOptions` | object | {...} | xterm.js 옵션 |
| `profiles` | object | {...} | 프로필별 테마 정의 |
| `defaultProfile` | string | `default` | 기본 프로필명 |
| `env` | object | {} | 사용자 정의 환경변수 |
| `addToNote` | object | `{lines:200, askLines:true}` | Add to Note 동작 설정 |
| `history` | object | `{mode:"none"}` | 터미널 입력 히스토리 저장 설정 |
| `snippets` | array | [] | 재사용 가능한 텍스트 템플릿 |
| `actions` | array | [...] | 액션 정의 배열 |
| `actionGroups` | array | [] | 설정 UI 분류용 액션 그룹 |
| `toolbar` | array | [...] | 표시할 액션 버튼 목록 (ID) |

---

## 4. Snippet & Action 정의 상세

### 4.1 Snippet 필드
```json
{
  "id": "unique-snippet-id",
  "label": "Snippet Label",
  "description": "스니펫 설명",
  "template": "재사용할 텍스트 템플릿"
}
```

### 4.2 Action 필드
```json
{
  "id": "unique-action-id",
  "label": "Button Label",
  "icon": "icon-name",
  "variant": "default|claude|codex|gemini",
  "template": "{rule}\n\n{request}",
  "params": [],
  "echo": false
}
```

- `template`: 최종 stdin으로 전달할 텍스트 템플릿
- `params`: `{key}` 치환에 사용할 입력 정의 배열
- `variant`: 툴바 버튼의 개별 스타일
- `echo`: 최종 텍스트를 사용자가 타이핑/붙여넣은 것처럼 터미널 화면에 표시할지 여부
  - `true`: 짧은 쉘 명령처럼 화면에 입력 내용을 보여주며 전달
  - `false`: PTY stdin으로 직접 전달해 긴 프롬프트/파일 내용 주입 과정을 숨김

### 4.3 Action Group 필드
```json
{
  "id": "ai",
  "label": "AI",
  "actionIds": ["claude-review", "codex-fix"]
}
```

- 그룹은 설정 UI 분류용이며 툴바 배치에는 직접 관여하지 않음

### 4.4 파라미터 정의

```json
{
  "key": "request",
  "type": "prompt",
  "placeholder": "요청 입력"
}
```

지원 타입:
- `snippet`: 다른 snippet의 template을 resolve
- `filePath`: 지정한 Vault 상대 파일 경로
- `fileContent`: 지정한 Vault 상대 파일 내용
- `currentFilePath`: 현재 활성 노트 경로
- `currentFileContent`: 현재 활성 노트 내용
- `selectedText`: 현재 선택 텍스트
- `text`: 고정 텍스트
- `prompt`: 실행 시 사용자에게 입력받는 텍스트

### 4.5 실행 규칙
1. `params`를 배열 순서대로 resolve
2. `template`의 `{key}`를 resolve 결과로 단순 문자열 치환
3. 치환되지 않은 `{key}`는 빈 문자열로 처리
4. 최종 텍스트를 현재 터미널 stdin으로 전달
5. shell quote, heredoc, CLI command 실행 방식은 action template에 작성

### 4.6 Shell template 예시

CLI 실행 방식은 action `template`에 직접 작성한다.

```text
claude <<'EOF'
{rule}

File: {filePath}

{request}
EOF
```

파일 경로만 넘기거나 shell redirection/pipe를 사용하는 것도 action template으로 표현한다.

```text
cat "{rulePath}" "{contextPath}" | codex
```

---

## 5. 스크립트 사용 가이드

스크립트 실행은 action `template` 안에 일반 쉘 명령으로 작성한다.

### 5.1 스크립트 폴더 예시
```
Vault/
├─ .vault-terminal/
│  └─ scripts/
│     ├─ search.sh
│     ├─ backup.sh
│     └─ custom-task.sh
```

### 5.2 스크립트 작성 가이드

**예시: search.sh**
```bash
#!/bin/bash
query="$1"
ext="${2:-md}"

echo "=== Search Results for '$query' in *.$ext ==="
grep -r "$query" . --include="*.$ext" || echo "No matches found"
```

**예시: backup.sh**
```bash
#!/bin/bash
timestamp=$(date +%Y%m%d_%H%M%S)
backup_dir="./backups/backup_$timestamp"

mkdir -p "$backup_dir"
cp -r . "$backup_dir" --exclude=".vault-terminal" --exclude=".obsidian"

echo "Backup created: $backup_dir"
```

### 5.3 스크립트 → 플러그인 통신

**입력:**
- action template에서 사용자가 직접 명령과 인자를 구성
- 예: `.vault-terminal/scripts/search.sh "{query}" "md"`

**출력:**
- 스크립트는 터미널에서 일반 명령으로 실행됨
- 표준출력/표준에러 처리는 쉘과 터미널이 그대로 담당

---

## 6. 링크 변환 상세 로직

### 6.1 Wikilink 감지

터미널 출력 버퍼에서 `[[...]]` 패턴을 정규식으로 탐지:

```typescript
const WIKILINK_RE = /\[\[[^\]]+\]\]/g;
```

- `[[linkpath]]`, `[[linkpath#heading]]`, `[[linkpath|alias]]`, `[[linkpath#heading|alias]]` 모두 매칭
- 파일 확장자 기반 경로 패턴은 지원하지 않음

### 6.2 컬럼 좌표 보정

xterm.js `IBufferLine`의 각 셀은 문자 단위가 아닌 컬럼 단위. CJK/이모지 등 double-width 문자는 2컬럼을 차지하므로, 문자 인덱스 → 컬럼 인덱스 변환이 필요:

```typescript
function buildCharToCol(line: IBufferLine): number[] {
  const charToCol: number[] = [];
  let col = 0;
  const cell = line.getCell(0);
  while (col < line.length) {
    const c = line.getCell(col, cell);
    if (!c) break;
    const width = c.getWidth();
    if (width === 0) { col++; continue; }
    charToCol.push(col);
    col += width;
  }
  return charToCol;
}
```

- `Unicode11Addon` 로드 시 Unicode 11 기준 width 정확도 보장
- `charToCol[i]` → i번째 문자의 xterm 컬럼 위치

### 6.3 링크 열기 (Obsidian 위임)

경로 해석을 플러그인이 직접 하지 않고 Obsidian API에 완전히 위임:

```typescript
app.workspace.openLinkText(linktext, '', false)
```

- `linktext`: `[[...]]` 내부 문자열 그대로 (예: `파일명`, `파일명#섹션`, `파일명|별칭`)
- Obsidian 설정(shortest/relative/absolute)에 따라 파일 resolve
- 동일 파일명 충돌 처리도 Obsidian 로직에 위임

---

## 7. 플러그인 아키텍처

### 7.1 파일 구조
```
obsidian-vault-terminal/
├── src/
│   ├── main.ts                 # 플러그인 진입점
│   ├── ui/
│   │   ├── toolbar.ts          # 액션 버튼 툴바
│   │   ├── settingsTab.ts      # 설정 UI
│   │   ├── modals.ts           # 설정 편집 모달
│   │   ├── dialog.ts           # 파라미터/런타임 다이얼로그
│   │   ├── iconRegistry.ts     # 설정/툴바 아이콘 정의
│   │   └── links.ts            # 외부 링크 상수
│   ├── terminal/
│   │   ├── terminal.ts         # xterm.js 래퍼 + PTY 연결
│   │   ├── pty.ts              # Python helper PTY 프로세스 관리
│   │   ├── pythonRuntime.ts    # Python/pywinpty runtime 상태 확인
│   │   ├── links.ts            # 링크 감지/렌더링
│   ├── actions/
│   │   ├── actionRegistry.ts   # 액션 등록/관리
│   │   ├── templateEngine.ts   # 템플릿 치환
│   │   └── scriptRunner.ts     # 사용자 스크립트 실행 보조
│   ├── config/
│   │   └── configManager.ts    # 설정 로드/저장
│   └── utils/
│       └── fonts.ts            # 시스템 폰트 조회
├── python/
│   ├── pty_helper.py           # JS와 OS PTY 사이 JSON-line 브릿지
│   └── backends/
│       ├── posix_backend.py    # macOS/Linux Python 표준 pty
│       └── winpty_backend.py   # Windows pywinpty backend
├── scripts/
│   └── link-vault.mjs          # 테스트 vault에 dist 산출물 링크
├── manifest.json
├── versions.json               # 마켓플레이스 버전 호환성 {"1.0.0": "0.15.0"}
├── src/plugin.css              # xterm.js 스타일 + 플러그인 UI
├── dist/                       # 배포 산출물
├── tsconfig.json
├── esbuild.config.mjs
└── package.json
```

### 7.2 핵심 클래스

**VaultTerminalPlugin** (main.ts)
- 플러그인 라이프사이클 관리 (onload/onunload)
- TerminalView 등록, 설정 탭 등록

**TerminalView** (terminal/terminal.ts)
- xterm.js 인스턴스 관리
- PtyManager 연결 (stdin/stdout 바인딩)

**PtyManager** (terminal/pty.ts)
- Python helper child process 생성/종료
- 쉘 프로세스 관리 (bash/zsh/fish/cmd/PowerShell)
- 리사이즈 이벤트 처리

**pythonRuntime** (terminal/pythonRuntime.ts)
- Python 실행 파일 탐색/상태 확인
- macOS/Linux `pty`, Windows `pywinpty` import 가능 여부 확인
- Runtime 탭 진단 정보 제공

**ActionRegistry** (actions/actionRegistry.ts)
- 액션 정의 로드/등록
- 커맨드 팔레트 통합

**TemplateEngine** (actions/templateEngine.ts)
- `{key}` 치환 로직

**ScriptRunner** (actions/scriptRunner.ts)
- 사용자 스크립트 실행 보조

---

## 8. 기술 스택 및 의존성

### 런타임 의존성

| 항목 | 버전 | 용도 |
|------|------|------|
| @xterm/xterm | ^5.0.0 | 터미널 렌더링 |
| @xterm/addon-fit | ^0.10.0 | 터미널 크기 자동 조절 |
| @xterm/addon-search | ^0.15.0 | 터미널 내 검색 |
| @xterm/addon-web-links | ^0.11.0 | URL 자동 링크 (obsidian:// 포함) |
| @xterm/addon-unicode11 | ^0.9.0 | Unicode 11 와이드 문자 지원 (한글 등) |
| ansi_up | ^6.0.2 | ANSI 이스케이프 시퀀스 파싱 (코드블록 정적 렌더링) |
| obsidian | latest | 플러그인 API |

### 개발 의존성

| 항목 | 버전 | 용도 |
|------|------|------|
| typescript | ^5.0.0 | 구현 언어 |
| esbuild | ^0.25.0 | 번들링 |
| @types/node | ^16.0.0 | Node.js 타입 |

### Python PTY runtime 주의사항
- macOS/Linux는 Python 3와 표준 `pty` 모듈 필요
- Windows는 Python과 같은 Python 환경에 설치된 `pywinpty` 필요
- Runtime 탭과 README에서 Python/pywinpty 상태 진단과 설치 가이드 제공
- Python helper 파일은 `dist/python/`에 포함되어야 함

---

## 9. 라이선스 및 제약

### 9.1 라이선스
- **플러그인**: MIT
- **xterm.js**: MIT
- **Obsidian API**: Obsidian 커뮤니티 플러그인 규정 준수

### 9.2 플랫폼 제약
- **지원 환경**: macOS, Linux, Windows
- **모바일 불가**: Obsidian 모바일의 Node/Electron/Python 실행 환경 부재
- **manifest.json**: `"isDesktopOnly": true` 필수
- **최소 요구사항**: Obsidian 0.15.0+

---

## 10. 개발 로드맵

1. 개발 환경 구축 — package.json, tsconfig, esbuild, manifest 등
2. xterm.js + Python PTY 연결, 기본 터미널 렌더링, 액션 버튼 레이아웃
3. data.json 기반 설정 저장, Runtime 진단, dist 배포 구조
4. Wikilink 감지/렌더링, 파일 drag & drop, 터미널 resize 안정화
5. Snippet 독립 모델 도입
6. Action을 template + params 단순 치환 모델로 정리
7. Toolbar를 action 버튼 나열과 variant 스타일 중심으로 정리
8. 커맨드 팔레트 통합, 버그 수정, 최종 테스트

---

## 11. 향후 확장 기능 (Out of Scope)

- AI 기반 명령 제안 (Claude API 통합)
- 플러그인 내 스크립트 편집기
- 터미널 멀티탭 지원
- 플러그인 마켓플레이스 배포
- 모바일 지원

---

## 12. 참고사항

### 12.1 기존 플러그인과의 차별점
- **polyipseity/obsidian-terminal**: 기본 터미널 임베드만 제공
- **vault-terminal**: 액션 + 양방향 연계 + 링크 변환 추가

### 12.2 설계 철학 정리
1. **플러그인 책임**: 입력 resolve, 텍스트 조합, 터미널 전달, 링크 렌더링
2. **템플릿 중심 제어**: 쉘 명령, AI CLI prompt, heredoc, redirection은 action template으로 표현
3. **명확한 분리**: Snippet은 텍스트 조각, Action은 실행 단위, Toolbar는 배치 UI
4. **확장 가능성**: data.json 설정과 향후 노트 기반 정의를 같은 모델로 매핑
