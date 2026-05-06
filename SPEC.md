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
- **쉘 연결**: node-pty (PTY 프로세스)
- **위치**: 옵시디언 사이드 패널 또는 탭
- **stdin/stdout**: xterm.js ↔ node-pty 양방향 연결
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
- config.json `toolbar` 배열 순서대로 렌더링
- 버튼 수가 많을 경우 가로 스크롤
- 모든 버튼 아이콘 기반, 라벨은 hover 툴팁으로 표시
- 아이콘: Obsidian 내장 lucide 아이콘 사용 (`setIcon()` API)

#### 2.2.2 버튼 동작 흐름
1. 사용자 버튼 클릭
2. 해당 액션의 파라미터 검사
3. **파라미터 있음** → 다이얼로그 순차 출력
    - 각 파라미터 필드 표시 (placeholder 포함)
    - 모든 입력 완료 → OK 클릭
4. **파라미터 없음** → 즉시 실행
5. 템플릿/스크립트 실행
6. 결과를 PTY stdin으로 터미널에 전송

#### 2.2.3 다이얼로그 시스템
- **다이얼로그 타입**: 옵시디언 Modal (기본 UI)
- **필드 렌더링**: 파라미터 개수만큼 입력 필드
- **각 필드**:
    - 라벨: 파라미터 name
    - 입력창: 텍스트 입력
    - Placeholder: 가이드 텍스트
    - 버튼: [Cancel] [OK]

#### 2.2.4 파라미터 특별 옵션
```json
{
  "name": "query",
  "placeholder": "검색 쿼리",
  "useSelectedText": false,
  "useCurrentContext": false,
  "required": true
}
```

---

### 2.3 명령 실행 방식

#### 2.3.1 방식 A: 템플릿 치환 (Template Mode)

**정의:**
```json
{
  "id": "find-md",
  "label": "Find Markdown",
  "mode": "template",
  "command": "find . -name {pattern}",
  "params": [{ "name": "pattern", "placeholder": "예: *.md, test*" }]
}
```

**동작:**
1. 사용자 입력: `*.md`
2. 템플릿 치환: `find . -name *.md`
3. PTY stdin으로 터미널 전송
4. 터미널에서 실행

**지원 구문:**
- `{paramName}` → 파라미터 값으로 치환
- 문자열은 그대로 전송 (쉘 해석)

#### 2.3.2 방식 B: 쉘 스크립트 (Script Mode)

**정의:**
```json
{
  "id": "advanced-search",
  "label": "Advanced Search",
  "mode": "script",
  "script": "search.sh",
  "params": [{ "name": "query", "useSelectedText": true }]
}
```

**동작:**
1. 스크립트 폴더 스캔: `.vault-terminal/scripts/search.sh`
2. 스크립트 실행: `./search.sh {query값}`
3. 표준출력을 PTY stdin으로 터미널 전송

**스크립트 작성:**
- 사용자가 직접 Vault 내 스크립트 폴더에 작성
- 플러그인은 스캔/실행만 담당
- 수정은 사용자가 텍스트 에디터에서 직접 (플러그인 X)

#### 2.3.3 방식 C: Obsidian URI (URI Mode)

**정의:**
```json
{
  "id": "open-file",
  "label": "Open File",
  "mode": "uri",
  "command": "obsidian://open?file={filepath}",
  "params": [{ "name": "filepath", "placeholder": "경로/파일명.md" }]
}
```

**동작:**
1. 파라미터 입력: `inbox/note.md`
2. URI 생성: `obsidian://open?file=inbox/note.md`
3. 옵시디언 URI 스킴 호출 (옵시디언 자체 처리)

---

### 2.4 파일 경로 → 링크 변환 시스템

#### 2.4.1 Vault 루트 설정
- **설정**: `vaultRoot: true`
- **의미**: Vault 디렉토리를 모든 경로의 루트로 설정
- **예**: `/Users/t1100088/Documents/obsidian` = Vault root

#### 2.4.2 경로 정규화 프로세스
```
입력 터미널 출력:
  - "./Inbox/note.md"
  - "../Inbox/note.md"
  - "/Users/t1100088/Documents/obsidian/Inbox/note.md"
  - "~/obsidian/Inbox/note.md"
↓ (정규화)

정규화된 경로:
  - "Inbox/note.md"
↓ (링크 변환)

클릭 가능한 링크:
  - [[Inbox/note.md]]
```

#### 2.4.3 경로 감지 (정규식)
```
패턴 1: 상대경로
/\.\/[\w\-. \/]+/g  매칭: "./Inbox/note.md"

패턴 2: 절대경로 (Vault 범위 내)
/\/Users\/t1100088\/Documents\/obsidian\/([\w\-. \/]+)/g

패턴 3: 파일 확장자 명시
/([\w\-. \/]+\.(md|txt|yaml|json))/g

패턴 4: wiki-link 형식
/\[\[([^\]]+)\]\]/g  매칭: "[[Inbox/note.md]]", "[[노트명]]"
```

**wiki-link 처리:**
- 터미널 출력에서 `[[노트명]]` 형식 감지
- 그대로 클릭 가능 링크로 렌더링 (이미 Vault 내 링크 형식)
- `app.workspace.openLinkText(noteName, '')` 로 열기
- CLI AI 툴이 노트명을 wiki-link 형식으로 출력할 경우 바로 열 수 있음

#### 2.4.4 링크 렌더링
- **xterm.js 커스터마이징**: registerLinkProvider API
- **표시 형식**: `[[경로/파일명]]` (옵시디언 기본 링크 형식)
- **스타일**: 밑줄, 다른 색상으로 표시 (마우스 호버 시 손가락 커서)
- **클릭 이벤트**:
  ```javascript
  activate: () => app.workspace.openLinkText(filepath, '');
  ```

#### 2.4.5 Vault 외부 경로 처리
- **정책**: Vault 범위 밖 파일은 링크 변환 X
- **이유**: 옵시디언 링크는 Vault 내 파일만 지원
- **대안**: 사용자가 직접 파일 매니저에서 열어야 함 (또는 obsidian:// URI 활용)

---

### 2.5 컨텍스트 활용

#### 2.5.1 현재 노트 컨텍스트 (Current Context)

**버튼 정의:**
```json
{
  "id": "current-context",
  "label": "Current Context",
  "mode": "context",
  "contextType": "currentFile",
  "command": "@search-related {currentFile}"
}
```

**동작:**
1. 플러그인이 현재 열려있는 노트 감지
2. 파일 경로 자동 획득 (app.workspace.getActiveFile())
3. 다이얼로그 스킵
4. 즉시 명령 실행: `@search-related inbox/note.md`

**사용 케이스:**
- 지금 보고 있는 노트의 관련 문서 검색
- 역링크 표시
- 같은 태그의 문서들 찾기

#### 2.5.2 선택된 텍스트 활용 (Selected Text)

**파라미터 옵션:**
```json
{ "name": "query", "useSelectedText": true }
```

**동작:**
1. 옵시디언에서 텍스트 선택
2. 버튼 클릭
3. 선택 텍스트 자동 획득 (editor.getSelectedText())
4. 다이얼로그 스킵
5. 명령 실행: 선택 텍스트를 파라미터로 사용

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
- config.json `addToNote.lines` 기본값: `200`
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
config.json에 추가 환경변수 정의 가능:
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

Obsidian 설정 탭에서 플러그인 전체 설정을 GUI로 관리. `config.json` 직접 편집 불필요.

#### Terminal 탭
- **터미널 옵션**: 폰트 크기, 줄 높이, 커서 스타일, 스크롤백 줄 수
- **프로필 관리**: 프로필 목록 / 추가 / 삭제 / 테마 색상 편집
- **기본 프로필**: 드롭다운으로 선택
- **환경변수**: 키-값 쌍 목록 / 추가 / 삭제
- **히스토리**: 저장 모드 선택 (none / note / daily), 폴더 경로, 최대 보관 수

#### Toolbar 탭
- **템플릿 관리**
  - 템플릿 목록 (id, label, mode)
  - 추가 / 수정 / 삭제
  - 편집 시: label, mode, command/script, `{placeholder}` 구성 (이름 / placeholder 텍스트 / required 여부)
- **액션 관리**
  - 액션 목록
  - 추가 / 수정 / 삭제
  - 편집 시: 기반 템플릿 선택, 파라미터 입력 프롬프트 설정, 아이콘 선택
- **툴바 구성**
  - 등록된 액션 목록에서 드래그 앤 드롭으로 순서 조정
  - 활성화 / 비활성화 토글

---

## 3. 설정 구조

### 3.1 설정 파일 위치
- **위치**: Vault root 내 `.vault-terminal/config.json`
- **생성**: 플러그인 첫 설치 시 자동 생성
- **편집**: 사용자가 직접 JSON 수정

### 3.2 전체 설정 예시

```json
{
  "version": "1.0.0",
  "vaultRoot": true,
  "scriptFolder": ".vault-terminal/scripts",
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
  "actions": [
    {
      "id": "find-files",
      "label": "Find Files",
      "icon": "search",
      "mode": "template",
      "command": "find . -name {pattern}",
      "params": [{ "name": "pattern", "placeholder": "정규식 패턴 (예: *.md)" }]
    },
    {
      "id": "search-grep",
      "label": "Grep Search",
      "icon": "search",
      "mode": "script",
      "script": "grep-search.sh",
      "params": [
        { "name": "query", "placeholder": "검색 단어" },
        { "name": "extension", "placeholder": "파일 확장자 (예: md)" }
      ]
    },
    {
      "id": "current-context",
      "label": "Current Context",
      "icon": "file",
      "mode": "context",
      "contextType": "currentFile",
      "command": "@echo {currentFile}"
    },
    {
      "id": "open-file",
      "label": "Open in Obsidian",
      "icon": "external-link",
      "mode": "uri",
      "command": "obsidian://open?file={filepath}",
      "params": [{ "name": "filepath", "placeholder": "경로/파일명.md" }]
    },
    {
      "id": "add-to-note",
      "label": "Add to Note",
      "icon": "plus",
      "mode": "passthrough",
      "action": "addTerminalOutputToNote"
    },
    {
      "id": "send-text",
      "label": "Send to Terminal",
      "icon": "send",
      "mode": "passthrough",
      "action": "sendSelectedTextToTerminal",
      "params": [{ "name": "text", "useSelectedText": true }]
    }
  ],
  "toolbar": ["find-files", "search-grep", "current-context", "open-file", "add-to-note", "send-text"],
  "ruleSets": [
    { "id": "claude-setup", "label": "Claude Workflow", "actions": ["current-context", "search-grep", "add-to-note"] }
  ],
  "pathPatterns": {
    "enabled": true,
    "patterns": [
      { "name": "relative", "regex": "\\.\\/.+(\\.\\w+)?" },
      { "name": "filename", "regex": "[\\w\\-. ]+\\.(md|txt|yaml|json|sh)" }
    ]
  }
}
```

### 3.3 주요 설정 항목

| 항목 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `vaultRoot` | bool | true | Vault를 경로 루트로 설정 |
| `scriptFolder` | string | `.vault-terminal/scripts` | 스크립트 폴더 상대경로 |
| `terminalOptions` | object | {...} | xterm.js 옵션 |
| `profiles` | object | {...} | 프로필별 테마 정의 |
| `defaultProfile` | string | `default` | 기본 프로필명 |
| `env` | object | {} | 사용자 정의 환경변수 |
| `addToNote` | object | `{lines:200, askLines:true}` | Add to Note 동작 설정 |
| `history` | object | `{mode:"none"}` | 터미널 입력 히스토리 저장 설정 |
| `actions` | array | [...] | 액션 정의 배열 |
| `toolbar` | array | [...] | 표시할 버튼 목록 (ID) |
| `ruleSets` | array | [...] | 액션 조합 정의 |
| `pathPatterns` | object | {...} | 경로 감지 정규식 |

---

## 4. 액션 정의 상세

### 4.1 공통 필드
```json
{
  "id": "unique-id",
  "label": "Button Label",
  "icon": "icon-name",
  "mode": "template|script|uri|context|passthrough",
  "description": "액션 설명"
}
```

### 4.2 Mode별 필드

#### Template Mode
```json
{ "mode": "template", "command": "find . -name {pattern}", "params": [...] }
```

#### Script Mode
```json
{ "mode": "script", "script": "search.sh", "workingDir": "<vault root>", "params": [...] }
```

#### URI Mode
```json
{ "mode": "uri", "command": "obsidian://open?file={filepath}", "params": [...] }
```

#### Context Mode
```json
{ "mode": "context", "contextType": "currentFile|currentTag|vaultPath", "command": "@action {context}" }
```

#### Passthrough Mode
```json
{ "mode": "passthrough", "action": "addTerminalOutputToNote|sendSelectedTextToTerminal", "params": [...] }
```

### 4.3 파라미터 정의

```json
{
  "name": "param-id",
  "placeholder": "입력 가이드",
  "type": "text|number|choice",
  "required": true,
  "useSelectedText": false,
  "useCurrentContext": false,
  "default": "기본값",
  "choices": ["option1", "option2"]
}
```

---

## 5. 스크립트 시스템

### 5.1 스크립트 폴더 구조
```
Vault/
├─ .vault-terminal/
│  ├─ config.json
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
- 커맨드라인 인자로 파라미터 전달
- 예: `./search.sh "query-value" "md"`

**출력:**
- 표준출력 (stdout) → 터미널에 출력
- 표준에러 (stderr) → 터미널 에러로 표시

---

## 6. 링크 변환 상세 로직

### 6.1 경로 감지 및 정규화

**입력 예시:**
```
$ find . -name "*.md"
./Inbox/claude code 세팅.md
./Inbox/project-candidates-review.md
/Users/t1100088/Documents/obsidian/Inbox/무제.md
../backup/old-note.md
```

**정규화 프로세스:**

| 입력 경로 | 정규화 | 링크 변환 | 결과 |
|----------|--------|---------|------|
| `./Inbox/claude code 세팅.md` | `Inbox/claude code 세팅.md` | ✓ | `[[Inbox/claude code 세팅.md]]` |
| `/Users/t1100088/Documents/obsidian/Inbox/무제.md` | `Inbox/무제.md` | ✓ | `[[Inbox/무제.md]]` |
| `../backup/old-note.md` | (Vault 범위 밖) | ✗ | 링크 변환 안 함 |

### 6.2 xterm.js 링크 렌더링

```typescript
term.registerLinkProvider({
  provideLinks: (bufferLineIndex, callback) => {
    const line = term.buffer.active.getLine(bufferLineIndex);
    const text = line?.translateToString() ?? '';
    const regex = /\.\/[\w\-. \/]+\.(\w+)|[\w\-. ]+\.md/g;
    const links: ILink[] = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      const normalizedPath = normalizePath(match[0]);
      if (isWithinVault(normalizedPath)) {
        links.push({
          range: { start: { x: match.index + 1, y: bufferLineIndex + 1 }, end: { x: match.index + match[0].length, y: bufferLineIndex + 1 } },
          text: `[[${normalizedPath}]]`,
          activate: () => openFileInObsidian(normalizedPath),
          decorations: { underline: true }
        });
      }
    }
    callback(links);
  }
});
```

### 6.3 파일 열기 (Obsidian API)

```typescript
function openFileInObsidian(filepath: string) {
  const file = app.vault.getAbstractFileByPath(filepath);
  if (file instanceof TFile) {
    app.workspace.openLinkText(filepath, '', false);
  } else {
    new Notice(`File not found: ${filepath}`);
  }
}
```

---

## 7. 플러그인 아키텍처

### 7.1 파일 구조
```
obsidian-vault-terminal/
├── src/
│   ├── main.ts                 # 플러그인 진입점
│   ├── ui/
│   │   ├── toolbar.ts          # 액션 버튼 툴바
│   │   └── dialog.ts           # 파라미터 입력 다이얼로그
│   ├── terminal/
│   │   ├── terminal.ts         # xterm.js 래퍼 + node-pty 연결
│   │   ├── pty.ts              # node-pty PTY 프로세스 관리
│   │   ├── links.ts            # 링크 감지/렌더링
│   │   └── executor.ts         # 명령 실행 (script/template용)
│   ├── actions/
│   │   ├── actionRegistry.ts   # 액션 등록/관리
│   │   ├── templateEngine.ts   # 템플릿 치환
│   │   └── scriptRunner.ts     # 스크립트 실행
│   ├── config/
│   │   └── configManager.ts    # 설정 로드/저장
│   └── utils/
│       ├── pathUtils.ts        # 경로 정규화
│       └── obsidianUtils.ts    # Obsidian API 래퍼
├── manifest.json
├── versions.json               # 마켓플레이스 버전 호환성 {"1.0.0": "0.15.0"}
├── styles.css                  # xterm.js 스타일 + 플러그인 UI
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
- node-pty IPty 인스턴스 생성/종료
- 쉘 프로세스 관리 (bash/zsh/cmd)
- 리사이즈 이벤트 처리

**ActionRegistry** (actions/actionRegistry.ts)
- 액션 정의 로드/등록
- 커맨드 팔레트 통합

**TemplateEngine** (actions/templateEngine.ts)
- `{paramName}` 치환 로직

**ScriptRunner** (actions/scriptRunner.ts)
- `.vault-terminal/scripts/` 스캔 및 실행 (child_process)

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
| node-pty | ^1.0.0 | 실제 PTY 쉘 연결 |
| ansi_up | ^6.0.2 | ANSI 이스케이프 시퀀스 파싱 (코드블록 정적 렌더링) |
| obsidian | latest | 플러그인 API |

### 개발 의존성

| 항목 | 버전 | 용도 |
|------|------|------|
| typescript | ^5.0.0 | 구현 언어 |
| esbuild | ^0.25.0 | 번들링 |
| @types/node | ^16.0.0 | Node.js 타입 |

### node-pty 빌드 주의사항
- native addon — Electron 버전에 맞는 prebuilt 바이너리 필요
- esbuild.config.mjs에서 `external: ['node-pty']` 설정
- 빌드 시 `.node` 바이너리를 출력 디렉토리에 복사
- 참고: polyipseity/obsidian-terminal 의 빌드 방식

---

## 9. 라이선스 및 제약

### 9.1 라이선스
- **플러그인**: MIT
- **xterm.js**: MIT
- **node-pty**: MIT
- **Obsidian API**: Obsidian 커뮤니티 플러그인 규정 준수

### 9.2 플랫폼 제약
- **지원 환경**: macOS, Linux, Windows
- **모바일 불가**: node-pty native addon 특성상 데스크탑 전용
- **manifest.json**: `"isDesktopOnly": true` 필수
- **최소 요구사항**: Obsidian 0.15.0+

---

## 10. 개발 로드맵

1. 개발 환경 구축 — package.json, tsconfig, esbuild, manifest 등
2. xterm.js + node-pty 연결, 기본 터미널 렌더링, 액션 버튼 레이아웃
3. 파라미터 다이얼로그, 템플릿 엔진, config 로드
4. 경로 감지 및 링크 렌더링, 클릭 이벤트
5. 스크립트 실행 시스템
6. 컨텍스트 활용 (현재 노트, 선택 텍스트), 양방향 연계
7. 커맨드 팔레트 통합, 버그 수정, 최종 테스트

---

## 11. 향후 확장 기능 (Out of Scope)

- AI 기반 명령 제안 (Claude API 통합)
- 플러그인 내 스크립트 편집기
- 터미널 멀티탭 지원
- 플러그인 마켓플레이스 배포
- 모바일 지원
- OS 파일 매니저에서 터미널로 드래그 앤 드롭 (경로 자동 입력)
- Obsidian 파일 탐색기에서 터미널로 드래그 앤 드롭 (내부 이벤트 호환 여부 확인 필요)

---

## 12. 참고사항

### 12.1 기존 플러그인과의 차별점
- **polyipseity/obsidian-terminal**: 기본 터미널 임베드만 제공
- **vault-terminal**: 액션 + 양방향 연계 + 링크 변환 추가

### 12.2 설계 철학 정리
1. **플러그인 책임**: 입출력 UI, 경로 변환, 링크 렌더링만
2. **사용자 책임**: 스크립트 작성, 명령어 구성
3. **명확한 분리**: 각 계층의 역할이 겹치지 않음
4. **확장 가능성**: JSON 설정만 수정해서 커스터마이즈 가능
