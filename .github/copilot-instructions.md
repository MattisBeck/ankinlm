# AnkiNLM Copilot Instructions

## Repository Overview

**AnkiNLM** is a lightweight browser extension (Chrome/Firefox) that exports NotebookLM flashcards to Anki-compatible CSV format. Built with WXT framework, React, and TypeScript, this is a small, focused project with ~10 TypeScript/TSX files totaling 25 source files (excluding dependencies).

**Key Technologies:**
- **Framework:** WXT 0.20.11 (Web Extension Framework)
- **Frontend:** React 19.1.1 with TypeScript 5.9.2
- **Build Tool:** Vite (via WXT)
- **Runtime:** Node.js v20.20.0, npm 10.8.2
- **Target Browsers:** Chrome (Manifest V3), Firefox (Manifest V2)

## Critical Build Instructions

### Installation & Setup

**ALWAYS run `npm install` first** - this is REQUIRED before any build operation. The `postinstall` script runs `wxt prepare` which generates critical type definitions in `.wxt/` directory.

```bash
npm install
```

If you encounter module resolution errors after a partial clean, run:
```bash
rm -rf node_modules && npm install
```

**Note:** A `node-forge` vulnerability exists in dependencies (1 high severity). This is a transitive dependency and does not affect the extension's security since it's a development/build tool. Running `npm audit fix` is optional.

### Build Commands (In Order of Usage)

1. **Type Check** (Fast validation, no output):
   ```bash
   npm run compile
   ```
   - Runs `tsc --noEmit`
   - Takes ~3-5 seconds
   - No output files generated
   - Use this for quick validation

2. **Development Build** (For testing):
   ```bash
   npm run dev              # Chrome (default)
   npm run dev:firefox      # Firefox
   ```
   - Starts development server with hot reload
   - Output in `.output/chrome-mv3/` or `.output/firefox-mv2/`
   - Warning about `manifest.manifest_version` is expected and can be ignored

3. **Production Build** (Required before zip):
   ```bash
   npm run build            # Chrome (default)
   npm run build:firefox    # Firefox
   ```
   - Takes ~2-3 seconds
   - Output in `.output/chrome-mv3/` or `.output/firefox-mv2/`
   - Warning about `manifest.manifest_version` is expected and can be ignored
   - Always succeeds if `npm install` was run

4. **Create Distribution Package**:
   ```bash
   npm run zip              # Chrome (default)
   npm run zip:firefox      # Firefox
   ```
   - Automatically runs build first
   - Creates `.output/wxt-react-starter-1.2-chrome.zip` (Note: filename uses package.json name, not the extension display name)
   - Takes ~3 seconds total

### Build Validation Sequence

To validate changes, run commands in this order:
```bash
npm run compile          # 1. Check types
npm run build            # 2. Build Chrome version
npm run build:firefox    # 3. Build Firefox version  
npm run zip              # 4. Create distribution package (optional)
```

### Common Build Issues & Workarounds

**Issue 1:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'consola'`
- **Cause:** Incomplete `node_modules` directory (e.g., after `rm -rf node_modules` fails)
- **Fix:** `rm -rf node_modules && npm install`

**Issue 2:** Missing `.wxt/tsconfig.json` errors
- **Cause:** `.wxt/` directory not generated
- **Fix:** Run `npm install` (triggers postinstall hook) or manually run `npx wxt prepare`

**Issue 3:** TypeScript errors about missing types
- **Cause:** `.wxt/types/` not generated
- **Fix:** Same as Issue 2

## Project Architecture & Layout

### Directory Structure
```
ankinlm/
├── .github/                    # GitHub configuration (workflows, etc.)
├── .wxt/                       # Generated types (gitignored, auto-regenerated)
├── .output/                    # Build output (gitignored)
│   ├── chrome-mv3/             # Chrome extension build
│   └── firefox-mv2/            # Firefox extension build
├── public/
│   └── icon/                   # Extension icons (16, 32, 48, 64, 96, 128 px)
├── src/
│   ├── entrypoints/            # WXT entrypoints (extension pages/scripts)
│   │   ├── background/         # Background service worker
│   │   │   └── index.ts        # Frame injection logic (Chrome/Firefox specific)
│   │   ├── content/            # Content script injected into NotebookLM
│   │   │   └── index.ts        # DOM manipulation, button creation
│   │   └── popup/              # Extension popup UI
│   │       ├── main.tsx        # React entry point
│   │       ├── App.tsx         # App wrapper component
│   │       ├── App.css         # App styles
│   │       └── style.css       # Global popup styles
│   ├── components/
│   │   └── Popup.tsx           # Main popup component (info, links)
│   ├── utils/
│   │   ├── utils.ts            # TSV creation, button styling, MathJax handling
│   │   └── typeguards.ts       # Type guards for FlashcardData & QuizData
│   ├── types.ts                # TypeScript interfaces (QuizData, FlashcardData)
│   └── app.config.ts           # Empty config file
├── package.json                # Dependencies and scripts
├── package-lock.json           # Locked dependency versions
├── tsconfig.json               # TypeScript config (extends .wxt/tsconfig.json)
├── wxt.config.ts               # WXT configuration (manifest, permissions)
├── README.md                   # User-facing documentation
├── PRIVACY_POLICY.md           # Privacy policy
└── .gitignore                  # Excludes node_modules, .output, .wxt, etc.
```

### Key Configuration Files

**wxt.config.ts** - Main extension configuration:
- Defines manifest differences for Chrome (MV3) vs Firefox (MV2)
- Sets permissions: `scripting`, `clipboardWrite`, `webNavigation`
- Host permissions for `notebooklm.google.com` and `*.usercontent.goog`
- Extension name, version (1.2), and description

**tsconfig.json** - TypeScript configuration:
- Extends `.wxt/tsconfig.json` (auto-generated)
- Enables `allowImportingTsExtensions`
- Sets `jsx: "react-jsx"`

**package.json** - Scripts reference:
- No test scripts defined (no test infrastructure)
- No linting scripts (no ESLint/Prettier configured)
- No pre-commit hooks

### Core Functionality

**Background Script** (`src/entrypoints/background/index.ts`):
- Different implementations for Chrome vs Firefox (uses `import.meta.env.FIREFOX`)
- **Chrome:** Injects script into blob URLs via `chrome.scripting.executeScript`
- **Firefox:** Uses `browser.webNavigation` and `browser.tabs.executeScript`
- Extracts data from `<app-root data-app-data="...">` attribute in NotebookLM iframes

**Content Script** (`src/entrypoints/content/index.ts`):
- **Chrome only** (Firefox implementation is empty stub)
- Observes DOM for `artifact-viewer` elements
- Listens for `NOTEBOOKLM_DATA` messages from background script
- Creates "Copy" and "Download" buttons in flashcard footer
- Handles TSV generation and clipboard operations

**Utility Functions** (`src/utils/utils.ts`):
- `createTsvBlob()`: Converts flashcard/quiz JSON to TSV with MathJax normalization
  - Handles `$...$` (inline math) → `\(...\)` or `\[...\]` (display math)
  - Escapes TSV fields with quotes if needed
  - Adds UTF-8 BOM for Excel compatibility
- `createStyledButton()`: Creates Material Design styled buttons matching NotebookLM UI

### Data Flow

1. User opens NotebookLM Studio with flashcards
2. Background script detects iframe load (`blob:https://` or `usercontent.goog/shim.html`)
3. Background script injects code to extract JSON from `<app-root data-app-data="...">`
4. Extracted JSON is posted to parent window via `postMessage`
5. Content script receives message, parses JSON, creates TSV blob
6. Content script adds "Copy" and "Download" buttons to flashcard footer
7. User clicks button → copies to clipboard or downloads `flashcards.tsv`

## Testing & Validation

**No Test Infrastructure:** This project has no automated tests, test runners, or test files. Manual testing is required.

### Manual Testing Process

1. **Build the extension:**
   ```bash
   npm run build            # or build:firefox
   ```

2. **Load in browser:**
   - **Chrome:** `chrome://extensions/` → "Load unpacked" → select `.output/chrome-mv3/`
   - **Firefox:** `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on" → select `.output/firefox-mv2/manifest.json`

3. **Test on NotebookLM:**
   - Open https://notebooklm.google.com/
   - Create or open a notebook with flashcards
   - Navigate to flashcard view (Studio → Flashcards)
   - Verify "Copy" and "Download" buttons appear in footer
   - Click "Copy" → verify clipboard contains TSV data
   - Click "Download" → verify `flashcards.tsv` downloads

4. **Test MathJax handling:**
   - Use flashcards with LaTeX expressions (e.g., `$\sin(x)$`, `$$\frac{a}{b}$$`)
   - Verify conversion to `\(...\)` and `\[...\]` format in TSV

### Known Issues

From `src/components/Popup.tsx`:
- **Window resize bug:** Resizing the NotebookLM window may cause buttons to disappear. Workaround: Refresh the page.
- **No history section:** Planned for future updates.

## CI/CD & Pre-Commit Checks

**No GitHub Actions/Workflows:** This repository has no `.github/workflows/` directory. No automated CI/CD pipelines exist.

**No Pre-Commit Hooks:** No Git hooks, no Husky, no lint-staged.

**No Linting:** No ESLint, Prettier, or other linters configured.

## Making Changes

### When Editing TypeScript/TSX Files

1. **Always verify types compile:**
   ```bash
   npm run compile
   ```

2. **Test in browser immediately** after building (see Manual Testing Process above)

3. **Be aware of browser-specific code:**
   - Check for `if (import.meta.env.FIREFOX)` conditionals
   - Chrome uses `chrome.*` APIs, Firefox uses `browser.*` (via polyfill)

### When Editing Dependencies

1. **Always run after package.json changes:**
   ```bash
   npm install
   ```

2. **Verify build still works:**
   ```bash
   npm run compile && npm run build
   ```

### When Editing wxt.config.ts

1. **Clean build recommended:**
   ```bash
   rm -rf .output .wxt
   npm run build
   ```

2. **Test both browsers:**
   ```bash
   npm run build && npm run build:firefox
   ```

## Important Notes for Agents

1. **TRUST THESE INSTRUCTIONS:** Only explore further if information is incomplete or incorrect. This document is comprehensive.

2. **NO TESTS TO RUN:** Do not attempt to run `npm test` or create test infrastructure unless explicitly asked. This project has no testing framework.

3. **NO LINTING:** Do not run or add linters unless explicitly asked. Match existing code style.

4. **BUILD WARNINGS ARE NORMAL:** The `manifest.manifest_version` warning from WXT can be safely ignored. It's a known WXT framework behavior.

5. **ALWAYS TEST IN BROWSER:** Since there are no automated tests, manual browser testing is the ONLY validation method for functional changes.

6. **GIT IGNORE PATTERNS:** Never commit:
   - `node_modules/`
   - `.output/`
   - `.wxt/`
   - `stats.html` and `stats-*.json`
   - `.local/`

7. **SECURITY VULNERABILITY:** The `node-forge` vulnerability in `npm audit` is a known issue in a transitive dev dependency. It does not affect the extension's runtime security. Do not attempt to fix unless explicitly asked.

8. **CLEAN BUILDS:** If you encounter any module resolution errors, the safest approach is:
   ```bash
   rm -rf node_modules .output .wxt && npm install
   ```

## Quick Reference

**Fastest validation:** `npm run compile` (3-5 sec)  
**Full validation:** `npm run compile && npm run build && npm run build:firefox` (~10 sec)  
**Distribution package:** `npm run zip` (3 sec, includes build)  
**Development mode:** `npm run dev` (hot reload enabled)  
**Clean build:** `rm -rf .output .wxt && npm run build`  
**Full clean:** `rm -rf node_modules .output .wxt && npm install && npm run build`
