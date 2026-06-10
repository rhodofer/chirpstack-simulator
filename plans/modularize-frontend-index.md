# Plan: Modularize Frontend Index.html

This plan details the modularization of `index.html` in the ChirpStack Simulator UI using build-time assembly with a Python script.

## 1. Goal
Split the monolithic `index.html` (approx. 986 lines) into logical, maintainable HTML components without changing the runtime file serving structure or breaking existing event listeners in `app.js`.

## 2. Directory Structure
All modular source files will live in `internal/api/frontend/src/`:
```
internal/api/frontend/src/
├── layout.html
├── sidebar.html
├── topbar.html
├── login.html
├── modals.html
└── tabs/
    ├── overview.html
    ├── devices.html
    ├── networks.html
    ├── device-list.html
    ├── settings.html
    └── console.html
```

## 3. Layout Placeholders
`src/layout.html` will contain placeholders in the format `<!-- {{COMPONENT_NAME}} -->` or `{{COMPONENT_NAME}}`:
- `{{SIDEBAR}}`
- `{{TOPBAR}}`
- `{{LOGIN}}`
- `{{MODALS}}`
- `{{TAB_OVERVIEW}}`
- `{{TAB_DEVICES}}`
- `{{TAB_NETWORKS}}`
- `{{TAB_DEVICE_LIST}}`
- `{{TAB_SETTINGS}}`
- `{{TAB_CONSOLE}}`

## 4. Python Build Script (`build.py`)
A python script `internal/api/frontend/build.py` will:
1. Read `src/layout.html`.
2. Load each sub-component file from `src/` and `src/tabs/`.
3. Perform string replacement for all placeholders.
4. Output the final consolidated `index.html` to `internal/api/frontend/index.html`.

## 5. Implementation Phases
- **Phase 1: Component Extraction:** Read the monolithic `index.html` and slice it into the target files under `src/`.
- **Phase 2: Layout Template:** Create `src/layout.html` with clean placeholders.
- **Phase 3: Python Compiler:** Implement `build.py` to assemble the files.
- **Phase 4: Verification:** Run `python build.py` and diff the generated `index.html` against the original to ensure 100% equivalence.
