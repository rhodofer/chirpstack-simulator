# Device Profile Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD management for ChirpStack Device Profiles in the simulator UI, allowing users to list, create, view, and delete device profiles per tenant.

**Architecture:** New `device_profiles.go` file in `internal/api/` mirrors the existing `organizations.go` pattern. ChirpStack gRPC `DeviceProfileService` is already wired in `internal/as/api.go:99-101`. Frontend "Cihazlar" tab (currently placeholder) becomes a data table with a creation modal.

**Tech Stack:** Go (net/http + ChirpStack gRPC), Vanilla HTML/CSS/JS frontend

---

## File Structure

| File | Responsibility | Type |
|------|---------------|------|
| `internal/api/device_profiles.go` | Device Profile HTTP handlers (list, get, create, delete) | Create |
| `internal/api/server.go` | Register new routes | Modify |
| `internal/api/frontend/index.html` | Replace Cihazlar placeholder with data table + modal | Modify |
| `internal/api/frontend/app.js` | State + API calls + render for device profiles | Modify |
| `internal/api/frontend/style.css` | Form grid layout for modal | Modify |

---

### Task 1: Create Device Profile Backend Handlers

**Files:**
- Create: `internal/api/device_profiles.go`

Create `internal/api/device_profiles.go` with this content (full Go file with types, helpers, and 4 handlers: list, get, create, delete). Uses `as.DeviceProfile().List/Get/Create/Delete` (already wired in `internal/as/api.go`).

- [ ] Commit: `git add internal/api/device_profiles.go && git commit -m "feat(api): add device profile CRUD handlers"`

---

### Task 2: Register Routes in Server

**Files:**
- Modify: `internal/api/server.go`

Add two route handlers after organization routes (before UI handler): `/api/device-profiles` (GET, POST) and `/api/device-profiles/` (GET, DELETE for `/api/device-profiles/{id}`).

- [ ] Commit: `git add internal/api/server.go && git commit -m "feat(api): register device profile routes"`

---

### Task 3: Update Frontend HTML

**Files:**
- Modify: `internal/api/frontend/index.html`

Replace Cihazlar tab placeholder with full data table (page-header, toolbar, table, pagination) using IDs prefixed with `dp-` (e.g., `dp-table`, `dp-table-body`, `dp-search-input`, `dp-pagination`).

Add new "Yeni Device Profile" modal after organization modal with form fields: Name, Tenant (select), Description, Region (select), MAC Version (select), RegParams (select), ADR Algorithm (text), OTAA/ClassB/ClassC (checkboxes).

- [ ] Commit: `git add internal/api/frontend/index.html && git commit -m "feat(ui): add device profile table and creation modal"`

---

### Task 4: Add Frontend CSS

**Files:**
- Modify: `internal/api/frontend/style.css`

Add styles for `.form-group select` and `.checkbox-label` (with checkbox accent-color). Place after existing form-row styles.

- [ ] Commit: `git add internal/api/frontend/style.css && git commit -m "feat(ui): add styles for select and checkbox form elements"`

---

### Task 5: Add Frontend JavaScript

**Files:**
- Modify: `internal/api/frontend/app.js`

**Step 1:** Add DOM references for all DP elements (24 new vars: `dpTableBody`, `dpSearchInput`, `dpTenantFilter`, `dpModalOverlay`, `dpName`, etc.)

**Step 2:** Add to `state` object: `dpList`, `dpFiltered`, `dpSort`, `dpPage`, `dpPageSize`, `dpSearchQuery`, `dpTenantFilter`

**Step 3:** Add functions:
- `fetchDeviceProfiles(tenantId)` — GET `/api/device-profiles?tenant_id=...`
- `createDeviceProfile(data)` — POST `/api/device-profiles`
- `deleteDeviceProfile(id)` — DELETE `/api/device-profiles/{id}` with confirm
- `findDp(id)` — helper
- `applyDpFiltersAndRender()` — filter + sort + paginate
- `renderDpTable()` — build rows
- `renderDpPagination()` — Geri/İleri + page nums
- `renderDpTotalCount()` — "Toplam: N Profil"
- `updateDpSortIcons()` — column header arrows
- `goToDpPage(n)`, `viewDeviceProfile(id)` — alert with details
- `populateDpTenantSelect()` — modal'da tenant dropdown
- `populateDpFilterTenantSelect()` — table üstü tenant filtresi
- `showDpModal()` / `hideDpModal()` / `handleDpModalSave()`

**Step 4:** Add event bindings:
- DP table sort (th.click)
- DP search input
- DP page size select
- DP refresh button
- DP tenant filter change
- "Yeni Device Profile" button → showDpModal
- DP modal close/cancel/save + overlay click

**Step 5:** In `init()`, add: `populateDpFilterTenantSelect(); await fetchDeviceProfiles("");` after `fetchOrganizations()`

- [ ] Commit: `git add internal/api/frontend/app.js && git commit -m "feat(ui): add device profile management JS"`

---

### Task 6: Final Verification

- [ ] Run `docker compose build` — should succeed
- [ ] Manual API test: `curl -s http://localhost:9002/api/device-profiles | jq`
- [ ] UI test: open browser, verify Cihazlar tab shows table, modal opens, form submits
- [ ] Commit any fixes

---

## Implementation Detail Reference

For full code blocks see: `docs/superpowers/specs/2026-06-08-device-profile-management-design.md` (to be written) and the brainstorm plan summary already presented to user. The implementer subagent will be given the full code in its prompt.

Key ChirpStack enum mappings (used in `handleCreateDeviceProfile`):
- `common.MacVersion_value` — `LORAWAN_1_0_0` through `LORAWAN_1_1_0`
- `common.RegParamsRevision_value` — `A`, `B`
- `common.Region_value` — `EU868`, `US915`, `AS923`, `AU915`, `IN865`, `KR920`, `RU864`

Default profile values (matching existing `simulator.go` behavior):
- `MacVersion = LORAWAN_1_0_3` (default in select)
- `RegParamsRevision = B` (default in select)
- `Region = EU868` (default in select)
- `AdrAlgorithmId = "default"`
- `SupportsOtaa = true`
- `SupportsClassB = false`
- `SupportsClassC = false`

API endpoints to be added:
- `GET /api/device-profiles?tenant_id=...` — list (tenant_id optional)
- `GET /api/device-profiles/{id}` — single
- `POST /api/device-profiles` — create (body: name, tenant_id, region, mac_version, reg_params_revision, supports_otaa, supports_class_b, supports_class_c, adr_algorithm_id, description)
- `DELETE /api/device-profiles/{id}` — delete

UI structure (mirrors organization table):
- Page header with title + tenant filter dropdown + "Yeni Device Profile" button
- Toolbar with search + refresh
- Table: Profil Adı | Bölge | MAC Versiyon | OTAA | İşlemler
- Empty state when no profiles
- Pagination footer
