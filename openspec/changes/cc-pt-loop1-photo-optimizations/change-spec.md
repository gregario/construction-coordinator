# Change Spec: Photo Subsystem Optimizations (planning-tools, Loop 1)

Addresses two quality gaps in the photo subsystem identified during the planning-tools milestone evaluation. Both gaps are implementation bugs — standard practices that were not applied during initial build.

---

## Gap Evidence

### Quality Gap 1: `<img>` Instead of `next/image`

- **Gap ID:** imp-img-next-image
- **Category:** performance_improvement
- **Severity:** medium
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** ESLint `@next/next/no-img-element` warnings on both files. `next/image` is the standard Next.js component for optimized image loading. No factory_question or factory_decision explains why `<img>` was chosen. Photos load from Supabase signed URLs which `next/image` supports via `remotePatterns` config.

#### Current State (What's Wrong)

- **Description:** Two photo-rendering components use raw `<img>` tags instead of `next/image`. Photos are the primary content on `/photos` and `/tasks/:id`. Construction site photos are typically 5-10MB HEIC/JPEG files. Without `next/image`, there is no automatic format optimization (WebP/AVIF), no responsive `srcSet`, and no lazy-loading optimization beyond the basic `loading="lazy"` attribute. This creates an LCP performance risk on the two most image-heavy screens.
- **PO Review Assessment:** "Photos are primary content on these screens — LCP performance critical." ESLint audit flagged 2 `@next/next/no-img-element` warnings. Design review noted "<img> instead of next/image in 2 places — LCP performance risk."
- **Heuristics Failed:** Nielsen Heuristic 7 (Flexibility and efficiency of use) — the app does not leverage the framework's built-in image optimization pipeline.
- **Affected Screens:** `/photos` (gallery view), `/tasks/:id` (photo section in TaskPhotosManager)
- **Affected Journeys:** "Browse project photos", "Upload photo to task" (viewing uploaded photos)

#### Affected Files

| File | Line | Current Code |
|------|------|-------------|
| `app/(app)/photos/page.tsx` | 115 | `<img src={signedUrls[photo.id]} alt={photo.file_name} className="aspect-square w-full object-cover" loading="lazy" />` |
| `components/photos/TaskPhotosManager.tsx` | 141 | `<img src={urls[photo.id]} alt={photo.file_name} className="aspect-square w-full object-cover" loading="lazy" />` |
| `next.config.ts` | — | No `images.remotePatterns` configured |

#### Previous Attempts (Do Not Repeat)

First attempt.

---

### Quality Gap 2: Missing Server-Side MIME Validation

- **Gap ID:** imp-server-mime-validation
- **Category:** interaction_improvement
- **Severity:** low
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** `app/actions/photos.ts` has no MIME or size validation before `supabase.storage.upload()`. `validatePhotoFile` exists in `lib/photos/operations.ts` and is called client-side in `TaskPhotosManager.tsx:44`, but the server action trusts the upload directly. Supabase bucket policy (image/* restriction) is the sole server enforcement. Defense-in-depth principle: server actions should validate inputs independently.

#### Current State (What's Wrong)

- **Description:** The `uploadPhoto` server action in `app/actions/photos.ts` accepts any file from FormData and uploads it to Supabase Storage without checking MIME type or file size. The `validatePhotoFile` function already exists in `lib/photos/operations.ts` (well-tested with 8 unit tests) but is only called client-side. A malicious or misconfigured client could bypass client-side validation and send unsupported file types or oversized files to the server action.
- **PO Review Assessment:** Heuristic 5 (Error prevention) scored "partial" — "Client-side validation present; server-side MIME validation absent in photos.ts (trusts Supabase bucket policy)."
- **Heuristics Failed:** Nielsen Heuristic 5 (Error prevention) — server action does not independently validate inputs.
- **Affected Screens:** `/tasks/:id` (photo upload trigger)
- **Affected Journeys:** "Upload photo to task"

#### Affected Files

| File | Line | Issue |
|------|------|-------|
| `app/actions/photos.ts` | 50-77 | `uploadPhoto` function — no validation between receiving FormData and calling `supabase.storage.upload()` |

#### Previous Attempts (Do Not Repeat)

First attempt.

---

## Target State

### From Library Heuristics

**Nielsen Heuristic 5 (Error prevention):**
- Rule: Validate all user inputs at the server boundary, independent of client-side validation.
- Measurement: Server action rejects invalid MIME types and oversized files before storage upload.
- Threshold: 100% of server-side mutation endpoints validate their inputs.

**Nielsen Heuristic 7 (Flexibility and efficiency of use):**
- Rule: Use framework-provided optimization tools for performance-critical content.
- Measurement: All user-facing images use `next/image` with proper optimization.
- Threshold: Zero `@next/next/no-img-element` ESLint warnings.

### From Reference Products

- **TeamGantt** and **BuildBook** both serve optimized images via CDN/image optimization pipelines. Construction photos on these platforms load as optimized thumbnails, not raw uploads.

### Concrete Description

**After fix — photo display (`/photos` and `/tasks/:id`):**

Both photo gallery grids render thumbnails using `next/image` with `fill` layout and `object-cover` styling, inside their existing `aspect-square` containers. The `next/image` component handles:
- Automatic format conversion (WebP/AVIF where supported)
- Responsive `srcSet` generation for different viewport widths
- Framework-managed lazy loading with blur placeholder potential
- Proper `sizes` attribute to prevent downloading oversized images

The visual appearance is identical to the current `<img>` rendering — same aspect ratio, same object-cover crop, same grid layout. The improvement is invisible to users but measurable in LCP and bandwidth.

`next.config.ts` includes a `remotePatterns` entry for the Supabase storage domain (read from `NEXT_PUBLIC_SUPABASE_URL` at build time, or using a wildcard pattern for `*.supabase.co`).

**After fix — photo upload (`/tasks/:id`):**

When a user submits a photo via the upload form, the `uploadPhoto` server action calls `validatePhotoFile` on the file's type, size, and name before attempting the storage upload. If validation fails, the server action returns `{ ok: false, error: "<specific validation message>" }` immediately — the same error messages the client-side validation produces. The client already handles `ok: false` responses and displays the error. No UI changes needed.

---

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A
- **Design Direction:** No visual changes. The `next/image` swap preserves the existing `aspect-square w-full object-cover` styling. The server-side validation adds no UI — errors use the existing error display path.
- **Design Constraints:** Photo grid layout, thumbnail aspect ratios, and the "No preview" fallback must remain unchanged.

---

## Acceptance Criteria

### Fix Story: fix-photos-next-image

AC-NI-1: next/image used in photos gallery
  GIVEN the /photos page renders with at least one photo that has a signed URL
  WHEN the page loads
  THEN each photo thumbnail is rendered using a next/image component (not a raw <img> tag)
  MEASUREMENT: DOM query — photo grid contains <img> elements with srcset attribute (next/image adds srcset; raw <img> does not)
  HEURISTIC: Nielsen 7 (Flexibility and efficiency of use)
  CLOSES_GAP: imp-img-next-image

AC-NI-2: next/image used in TaskPhotosManager
  GIVEN a task detail page with at least one photo that has a signed URL
  WHEN the photo section renders
  THEN each photo thumbnail is rendered using a next/image component (not a raw <img> tag)
  MEASUREMENT: DOM query — photo thumbnails within [data-testid="photo-thumb"] contain <img> elements with srcset attribute
  HEURISTIC: Nielsen 7 (Flexibility and efficiency of use)
  CLOSES_GAP: imp-img-next-image

AC-NI-3: Supabase storage domain configured in remotePatterns
  GIVEN the next.config.ts file
  WHEN inspected
  THEN an images.remotePatterns entry exists that matches the Supabase storage hostname (*.supabase.co or the specific project URL)
  MEASUREMENT: Code review — next.config.ts contains images.remotePatterns with supabase hostname pattern
  HEURISTIC: Nielsen 7 (Flexibility and efficiency of use)
  CLOSES_GAP: imp-img-next-image

AC-NI-4: Photo thumbnails retain aspect-square object-cover styling
  GIVEN the /photos page or a task detail page with photos
  WHEN photo thumbnails render
  THEN each thumbnail displays as a square crop (aspect-ratio 1/1) with object-cover fit
  MEASUREMENT: DOM query — next/image wrapper or img element has aspect-square and object-cover classes (or equivalent computed styles)
  CLOSES_GAP: imp-img-next-image

AC-NI-5: No ESLint @next/next/no-img-element warnings in photo files
  GIVEN the files app/(app)/photos/page.tsx and components/photos/TaskPhotosManager.tsx
  WHEN ESLint runs
  THEN zero @next/next/no-img-element warnings are reported for these files
  MEASUREMENT: ESLint output — 0 no-img-element warnings in the two photo files
  CLOSES_GAP: imp-img-next-image

### Fix Story: fix-server-mime-validation

AC-MV-1: Server action validates MIME type before upload
  GIVEN a call to uploadPhoto with a file of type "application/pdf"
  WHEN the server action processes the request
  THEN it returns { ok: false, error: "Unsupported file type..." } WITHOUT calling supabase.storage.upload()
  MEASUREMENT: Unit test — uploadPhoto rejects unsupported MIME types with specific error message; no storage upload attempted
  HEURISTIC: Nielsen 5 (Error prevention)
  CLOSES_GAP: imp-server-mime-validation

AC-MV-2: Server action validates file size before upload
  GIVEN a call to uploadPhoto with a valid MIME type but file size > 10 MB
  WHEN the server action processes the request
  THEN it returns { ok: false, error: "File is X MB — maximum is 10 MB." } WITHOUT calling supabase.storage.upload()
  MEASUREMENT: Unit test — uploadPhoto rejects oversized files with specific error message; no storage upload attempted
  HEURISTIC: Nielsen 5 (Error prevention)
  CLOSES_GAP: imp-server-mime-validation

AC-MV-3: Valid files still upload successfully
  GIVEN a call to uploadPhoto with a valid JPEG file under 10 MB
  WHEN the server action processes the request
  THEN validation passes and the file is uploaded to Supabase Storage as before
  MEASUREMENT: Integration test — uploadPhoto with valid file proceeds to storage upload and returns { ok: true }
  CLOSES_GAP: imp-server-mime-validation

---

## Scope

### In Scope

- `app/(app)/photos/page.tsx` — replace `<img>` at line 115 with `next/image` Image component
- `components/photos/TaskPhotosManager.tsx` — replace `<img>` at line 141 with `next/image` Image component
- `next.config.ts` — add `images.remotePatterns` for Supabase storage domain
- `app/actions/photos.ts` — add `validatePhotoFile` call before `supabase.storage.upload()`
- Tests for the new server-side validation behavior

### Out of Scope (Do Not Touch)

- Photo upload UI flow (TaskPhotosManager upload form, file input, capture attribute)
- Photo delete functionality
- Document upload/download (separate subsystem)
- Gallery grouping logic (`groupPhotosByStage`)
- Supabase storage bucket configuration
- Any other pages or components not listed above

### Regression Risk

- Changing `<img>` to `next/image` with `fill` prop requires the parent container to have `position: relative` and defined dimensions. The existing `aspect-square w-full` containers provide dimensions, but verify `relative` positioning is present or added.
- Supabase signed URLs contain query parameters (token, expiry). Verify `next/image` passes these through correctly (it does — next/image fetches the full URL).
- Server-side validation must use the same MIME type list and size limit as `validatePhotoFile` in `lib/photos/operations.ts`. Importing the same function ensures consistency.
- Existing photo upload tests should continue to pass after adding server-side validation.

---

## Root Cause Context

### Gap 1: imp-img-next-image

- **Classification:** implementation_bug
- **What Went Wrong:** The builder used raw `<img>` tags for photo thumbnails instead of `next/image`. This is a common oversight when working with dynamic URLs (Supabase signed URLs), as `next/image` requires `remotePatterns` configuration. The builder may not have been aware of this requirement or defaulted to `<img>` for simplicity during rapid iteration on the photo feature.
- **Why Previous Approach Failed:** First attempt — no previous approach.
- **What's Different This Time:** The spec explicitly requires (1) adding `remotePatterns` to `next.config.ts` for the Supabase domain and (2) using `next/image` with `fill` prop in both photo components. The signed URL compatibility is confirmed — `next/image` fetches from the full URL at request time.

### Gap 2: imp-server-mime-validation

- **Classification:** implementation_bug
- **What Went Wrong:** The builder implemented `validatePhotoFile` and called it client-side in `TaskPhotosManager`, but did not add the same validation to the `uploadPhoto` server action. The server action trusts FormData directly and proceeds to `supabase.storage.upload()`. The Supabase bucket policy (image/* MIME restriction) provides a real server-side enforcement layer, which may have given the builder false confidence that server-side validation was covered.
- **Why Previous Approach Failed:** First attempt — no previous approach.
- **What's Different This Time:** The spec requires importing and calling the existing `validatePhotoFile` function in the server action, between the ownership check and the storage upload. The function already exists and is well-tested — this is a one-line import and a 4-line validation block.
