# Menu Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the primary sidebar and duplicate top-bar tabs, making the secondary sidebar the single navigation menu.

**Architecture:** Delete the primary sidebar entirely (HTML + CSS + JS), simplify the top bar to show only a hamburger button, page title, badges, and theme toggle. All navigation flows through the secondary sidebar.

**Tech Stack:** Vanilla HTML/CSS/JS (no frameworks)

---

### Task 1: Remove Primary Sidebar from HTML

**Files:**
- Modify: `internal/api/frontend/index.html:12-43`

- [ ] **Step 1: Delete the primary sidebar block**

Remove the entire `<aside class="primary-sidebar">` block (lines 12-43):

```html
<!-- DELETE THIS ENTIRE BLOCK -->
<aside class="primary-sidebar" id="primary-sidebar">
    <div class="primary-sidebar-header">
        <div class="primary-sidebar-logo">⚡</div>
        <span class="primary-sidebar-brand">Falt SaaS</span>
    </div>
    <nav class="primary-nav">
        <div class="primary-nav-item active" data-tab="overview" data-tooltip="Genel Bakış" id="nav-overview">
            <span class="nav-icon">☰</span>
            <span class="nav-label">Genel Bakış</span>
        </div>
        <div class="primary-nav-item" data-tab="devices" data-tooltip="Cihazlar" id="nav-devices">
            <span class="nav-icon">⚡</span>
            <span class="nav-label">Cihazlar</span>
        </div>
        <div class="primary-nav-item" data-tab="settings" data-tooltip="Ayarlar" id="nav-settings">
            <span class="nav-icon">⚙</span>
            <span class="nav-label">Ayarlar</span>
        </div>
    </nav>
    <div class="primary-sidebar-footer">
        <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" title="Menüyü Genişlet/Daralt">
            <span class="toggle-icon-expand">»</span>
            <span class="toggle-icon-collapse">«</span>
        </button>
        <div class="user-chip" style="margin-top:8px;">
            <div class="user-avatar">A</div>
        </div>
    </div>
</aside>
```

- [ ] **Step 2: Update top bar HTML**

Replace the current top bar content. Remove the tab buttons, keep hamburger + page title + right side badges:

```html
<div class="top-bar">
    <div class="top-bar-left">
        <button class="hamburger-btn" id="hamburger-btn">☰</button>
        <div class="page-title-bar" id="page-title-bar">Organizasyonlar</div>
    </div>
    <div class="top-bar-right">
        <span id="connection-badge" class="badge badge-offline">Bağlantı Yok</span>
        <span id="status-badge" class="badge badge-idle">IDLE</span>
        <span id="uptime-badge" class="badge badge-uptime" style="display:none;"></span>
        <button class="theme-toggle" id="theme-toggle" title="Tema Değiştir">🌙</button>
    </div>
</div>
```

- [ ] **Step 3: Verify HTML structure**

Open `index.html` and confirm:
- No `<aside class="primary-sidebar">` exists
- Top bar has hamburger + page title + badges only
- Secondary sidebar is unchanged

- [ ] **Step 4: Commit**

```bash
git add internal/api/frontend/index.html
git commit -m "refactor(ui): remove primary sidebar from HTML, simplify top bar"
```

---

### Task 2: Remove Primary Sidebar CSS

**Files:**
- Modify: `internal/api/frontend/style.css`

- [ ] **Step 1: Delete primary sidebar CSS block**

Delete the entire `/* ═══ PRIMARY SIDEBAR` section (lines 65-282). This includes:
- `.primary-sidebar` and all nested selectors
- `.primary-sidebar-header`, `.primary-sidebar-logo`, `.primary-sidebar-brand`
- `.primary-nav`, `.primary-nav-item`, `.primary-nav-item.active`, `.primary-nav-item.active::before`
- `.primary-sidebar.expanded` and all expanded state rules
- `.nav-label` and related rules
- `.sidebar-toggle-btn` and all variants
- `.primary-sidebar-footer`
- `.user-chip`, `.user-avatar`, `.user-info`
- Tooltip rules (`.primary-nav-item[data-tooltip]:hover::after`)

- [ ] **Step 2: Delete primary sidebar responsive rules**

In the `@media` sections, remove all primary-sidebar related rules:
- `@media (max-width: 1100px)`: Remove `.primary-sidebar`, `.primary-sidebar.expanded`, `.primary-nav-item[data-tooltip]:hover::after` rules
- `@media (max-width: 640px)`: Remove `.primary-sidebar`, `.primary-sidebar.open`, `.primary-sidebar.expanded` rules

- [ ] **Step 3: Update top bar CSS**

Replace the `.top-bar-left` styles. Remove `.top-bar-tabs` and `.top-bar-tab` rules. Add `.page-title-bar`:

```css
/* Remove these: */
/* .top-bar-tabs { ... } */
/* .top-bar-tab { ... } */
/* .top-bar-tab:hover { ... } */
/* .top-bar-tab.active { ... } */

/* Add this: */
.page-title-bar {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
}
```

- [ ] **Step 4: Delete CSS variable for primary sidebar width**

In `:root`, remove:
```css
--primary-sidebar-width: 72px;
```

- [ ] **Step 5: Verify CSS**

Open `style.css` and confirm:
- No `.primary-sidebar` rules exist
- No `.primary-nav` rules exist
- No `.top-bar-tab` rules exist
- `.page-title-bar` is defined
- Responsive sections don't reference primary sidebar

- [ ] **Step 6: Commit**

```bash
git add internal/api/frontend/style.css
git commit -m "refactor(ui): remove primary sidebar CSS, add page-title-bar"
```

---

### Task 3: Update JavaScript — Remove Primary Sidebar References

**Files:**
- Modify: `internal/api/frontend/app.js`

- [ ] **Step 1: Remove primary sidebar DOM references**

Delete these lines from the DOM References section:

```javascript
// DELETE:
var primarySidebar    = $("#primary-sidebar");
var sidebarToggleBtn  = $("#sidebar-toggle-btn");
var navOverview       = $("#nav-overview");
var navDevices        = $("#nav-devices");
var navSettings       = $("#nav-settings");
```

- [ ] **Step 2: Add page title bar reference**

Add this new reference after the existing DOM references:

```javascript
var pageTitleBar      = $("#page-title-bar");
```

- [ ] **Step 3: Delete primary sidebar functions**

Delete these entire functions:

```javascript
// DELETE: togglePrimarySidebar()
function togglePrimarySidebar() {
    primarySidebar.classList.toggle("expanded");
    var isExpanded = primarySidebar.classList.contains("expanded");
    localStorage.setItem("falt-sidebar-expanded", isExpanded ? "1" : "0");
}

// DELETE: restoreSidebarState()
function restoreSidebarState() {
    var saved = localStorage.getItem("falt-sidebar-expanded");
    if (saved === "1") {
        primarySidebar.classList.add("expanded");
    }
}
```

- [ ] **Step 4: Add updatePageTitle function**

Add this new function after the `switchTab` function:

```javascript
function updatePageTitle() {
    var titles = {
        overview: "Organizasyonlar",
        devices: "Cihazlar",
        settings: "Ayarlar"
    };
    if (pageTitleBar) {
        pageTitleBar.textContent = titles[state.currentTab] || "Genel Bakış";
    }
}
```

- [ ] **Step 5: Update switchTab function**

Remove the primary sidebar nav update loop from `switchTab()`. The function should become:

```javascript
function switchTab(name) {
    state.currentTab = name;

    // Tüm tab content'leri gizle
    var contents = $$(".tab-content");
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove("active");
    }

    // Seçili tab'ı göster
    var targetContent = $("#content-" + name);
    if (targetContent) targetContent.classList.add("active");

    // Sayfa başlığını güncelle
    updatePageTitle();
}
```

- [ ] **Step 6: Remove primary sidebar event bindings**

Delete these event binding sections:

```javascript
// DELETE: Primary sidebar nav binding
$$(".primary-nav-item").forEach(function (item) {
    item.addEventListener("click", function () {
        switchTab(this.getAttribute("data-tab"));
    });
});

// DELETE: Primary sidebar toggle binding
sidebarToggleBtn.addEventListener("click", togglePrimarySidebar);
```

- [ ] **Step 7: Remove restoreSidebarState from init**

In the `init()` function, delete this line:

```javascript
// DELETE:
restoreSidebarState();
```

- [ ] **Step 8: Verify JavaScript**

Open `app.js` and confirm:
- No references to `primarySidebar`, `sidebarToggleBtn`, `navOverview`, `navDevices`, `navSettings`
- No `togglePrimarySidebar()` or `restoreSidebarState()` functions
- `switchTab()` has no primary sidebar nav loop
- `updatePageTitle()` function exists
- `init()` doesn't call `restoreSidebarState()`

- [ ] **Step 9: Commit**

```bash
git add internal/api/frontend/app.js
git commit -m "refactor(ui): remove primary sidebar JS, add page title update"
```

---

### Task 4: Final Verification

**Files:**
- All: `internal/api/frontend/index.html`, `style.css`, `app.js`

- [ ] **Step 1: Visual check in browser**

Open the app in browser and verify:
- Single sidebar (iofeSaaS logo) is visible on the left
- Top bar shows hamburger + "Organizasyonlar" title + badges + theme toggle
- No duplicate "Genel Bakış", "Cihazlar", "Ayarlar" anywhere
- Secondary sidebar menu items work (clicking changes page title)

- [ ] **Step 2: Responsive check**

Resize browser to test:
- At ~1100px: sidebar should still work
- At ~900px: hamburger appears, sidebar slides in/out
- At ~640px: sidebar hidden by default, hamburger opens it

- [ ] **Step 3: Menu navigation check**

Click through all secondary sidebar items:
- "Genel Bakış" → shows organizations table, title = "Organizasyonlar"
- "Cihazlar" → shows devices placeholder, title = "Cihazlar"
- "Ayarlar" → shows settings, title = "Ayarlar"
- "Yönetim > Organizasyonlar" → shows organizations table
- All "Yakında" items should be non-clickable

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "fix(ui): menu consolidation final adjustments"
```
