# Vellum System

Vellum System is a standalone visual system for warm, focused, paper-first interfaces. It provides a portable CSS entrypoint organized into tokens, atoms, molecules, organisms, templates, and pages.

Use it as a portable visual reference for the Vellum look:

- warm paper background
- white document canvas
- Fraunces editorial surfaces
- Inter interface text
- IBM Plex Mono metadata
- sage primary action
- transparent/minimal inputs
- low-contrast archive controls
- white archive cards with hairline borders
- small mono status badges
- stamped status seal
- subtle burn-out removal motion

## Files

- `vellum.css`: entrypoint that imports the layered system in order.
- `css/00-tokens.css`: tokens, fonts, scoped base reset, body wrapper, scrollbar.
- `css/01-atoms.css`: single-purpose primitives like text styles, buttons, inputs, badges.
- `css/02-molecules.css`: small composed groups like brand clusters, search fields, metadata rows.
- `css/03-organisms.css`: larger sections/components like nav, archive cards, document surfaces, tables.
- `css/04-templates.css`: page layout patterns, document template layout, print behavior, motion.
- `css/05-pages.css`: sample/page-specific composition helpers.
- `sample.html`: a minimal specimen showing Vellum patterns.
- `README.md`: notes for humans and agents.
- `LICENSE`: MIT license for reuse.

## Entry Point

Use `vellum.css` as the only public CSS entrypoint:

```html
<link rel="stylesheet" href="vellum-system/vellum.css">
```

The files inside `css/` are organized for maintenance and learning. Agents and consuming projects should import `vellum.css`, not individual layer files, unless they are intentionally customizing the system.

## Agent Contract

When using this system in another project:

- Treat this folder as the standalone source for reuse.
- Use these styles only as a visual layer.
- Do not infer features, data models, storage, navigation, or domain behavior from the sample.
- Rename labels and content to the target project.
- Do not add extra design-framework components unless the target project asks for them.
- If you need a component not represented here, style it by analogy with the closest existing pattern instead of expanding the system first.

## Setup

Copy the standalone `vellum-system` folder into a project and link the stylesheet:

```html
<link rel="stylesheet" href="vellum-system/vellum.css">
```

Use `class="vellum"` on `body` or a wrapper:

```html
<body class="vellum">
    <main class="vellum-container">
        <section class="vellum-document">
            <h1 class="vellum-serif">Your content</h1>
        </section>
    </main>
</body>
```

## Tokens

| Token | Value | Source role |
| --- | --- | --- |
| `--vellum-bg` | `#fdfaf6` | body background |
| `--vellum-accent` | `#e8f0e9` | primary pastel button |
| `--vellum-text` | `#2d2d2d` | default text |
| `--vellum-ink` | `#1a1a1a` | document text |
| `--vellum-accent-text` | `#4a5d4c` | text on sage button |
| `--vellum-muted` | `#6b7280` | archive inputs |
| `--vellum-faint` | `#9ca3af` | inactive controls |
| `--vellum-rule` | `#f3f4f6` | table and section dividers |
| `--vellum-hairline` | `rgba(0, 0, 0, 0.05)` | canvas and card borders |
| `--vellum-hover-line` | `rgba(0, 0, 0, 0.12)` | quiet control hover |
| `--vellum-focus-line` | `rgba(0, 0, 0, 0.24)` | quiet control focus |
| `--vellum-active-line` | `rgba(0, 0, 0, 0.18)` | active view toggle |
| `--vellum-shadow-paper` | `0 10px 25px -5px rgba(0, 0, 0, 0.02)` | document canvas |

## Type

| Class | Font | Source role |
| --- | --- | --- |
| `.vellum-mono` | IBM Plex Mono | labels, refs, controls, metadata |
| `.vellum-serif` | Fraunces | document content, titles, card names |
| `.vellum` | Inter | shell and default interface |

## Layering

The classes are organized using a small atomic-design hierarchy. The CSS entrypoint imports the layers in this order:

1. Tokens
2. Atoms
3. Molecules
4. Organisms
5. Templates
6. Pages

Keep new system work in the lowest layer that can express it. For example, a text style belongs in atoms, a search field wrapper belongs in molecules, and a full toolbar belongs in organisms.

## Component Reference

This section is the practical contract for humans and agents composing with Vellum. Use these patterns as visual building blocks only. Replace the sample content and labels with whatever the target project needs.

### Scope And Page Shell

Purpose: apply Vellum without leaking styles into the rest of a project.

Markup:

```html
<body class="vellum">
    <nav class="vellum-nav">...</nav>
    <main class="vellum-container">...</main>
</body>
```

Guidance:

- Put `.vellum` on `body` when the whole page should use the system.
- Put `.vellum` on a wrapper when Vellum is embedded inside another project.
- Use `.vellum-container` for the main readable page width.
- Avoid nesting unrelated framework resets inside `.vellum` unless you have checked the cascade.

Accessibility:

- Keep the document's natural heading order.
- Use landmarks such as `nav`, `main`, `section`, `article`, and `footer`.

### Typography

Purpose: create the Vellum rhythm of editorial headings, quiet metadata, and readable interface copy.

Markup:

```html
<p class="vellum-kicker">Context label</p>
<h1 class="vellum-serif">Primary title</h1>
<p>Readable body copy in the default interface font.</p>
<span class="vellum-mono">Small metadata</span>
```

Guidance:

- Use Fraunces through `.vellum-serif` for titles, document content, and card names.
- Use IBM Plex Mono through `.vellum-mono`, `.vellum-kicker`, and metadata classes for refs, labels, controls, and summaries.
- Keep metadata small, uppercase, and widely tracked.
- Use body copy sparingly; Vellum works best when the interface is quiet and scan-friendly.

Accessibility:

- Do not use `.vellum-kicker` as a heading replacement.
- Avoid all-uppercase for long readable sentences.

### Buttons

Purpose: provide quiet actions without turning the interface into a generic component library.

Primary action:

```html
<button class="vellum-button-pastel">
    <span aria-hidden="true">+</span> Create
</button>
```

Icon action:

```html
<button class="vellum-icon-button" aria-label="Upload">
    &uarr;
</button>
```

Card action:

```html
<button class="vellum-card-action">Copy</button>
<button class="vellum-card-action vellum-card-action-danger">Remove</button>
```

States:

- Hover is intentionally subtle.
- Use real `button` elements for commands.
- Use links only for navigation.
- Use `.vellum-card-action-danger` only for destructive actions.

Accessibility:

- Icon-only buttons must have `aria-label`.
- Do not rely on color alone to indicate destructive actions.

### Forms

Purpose: keep inputs close to the Vellum document/editor feel: transparent, quiet, and line-based.

Default form atom:

```html
<label for="name">Name</label>
<input id="name" type="text" placeholder="Neutral placeholder">
```

Minimal editable field:

```html
<input class="vellum-input-minimal" type="text" value="Editable value">
```

Quiet toolbar field:

```html
<label class="vellum-search-field">
    <span class="vellum-search-icon" aria-hidden="true">&#9906;</span>
    <input class="vellum-quiet-input vellum-archive-search" type="search" placeholder="Search title, ref, client">
</label>
```

Quiet select:

```html
<select class="vellum-quiet-select vellum-archive-select">
    <option>Newest first</option>
    <option>Oldest first</option>
</select>
```

Guidance:

- Default text inputs, textareas, and selects inside `.vellum` already use the quiet underline style.
- Use `.vellum-input-minimal` for document-like editable content.
- Use `.vellum-quiet-input` and `.vellum-quiet-select` for compact toolbar controls.
- Pair `.vellum-archive-search` and `.vellum-archive-select` with the quiet classes when you want the exact mono archive-control treatment.

Accessibility:

- Every form control needs a label. If a visual label is not desired, use an accessible hidden-label pattern in the consuming project.
- Preserve visible focus. Do not remove focus outlines without replacing them.

### Navigation Tabs

Purpose: small top-level navigation links with Vellum's mono, restrained tab styling.

Markup:

```html
<div class="vellum-nav-tabs">
    <a class="vellum-nav-tab is-active" href="#one">One</a>
    <a class="vellum-nav-tab" href="#two">Two</a>
    <a class="vellum-nav-tab" href="#three">Three</a>
</div>
```

Guidance:

- Use anchors for navigation.
- Use `.is-active` for the current section or page.
- Keep labels short.

Accessibility:

- If these become true interactive tabs that swap panels without navigation, add the proper `role="tablist"`, `role="tab"`, `aria-selected`, and keyboard behavior in the target project.

### Toolbar, Search, And View Toggles

Purpose: compose filter/search/view controls in the compact Vellum archive rhythm.

Markup:

```html
<div class="vellum-archive-toolbar">
    <div class="vellum-filter-row">
        <label class="vellum-search-field">
            <span class="vellum-search-icon" aria-hidden="true">&#9906;</span>
            <input class="vellum-quiet-input vellum-archive-search" type="search" placeholder="Search">
        </label>
        <select class="vellum-quiet-select vellum-archive-select">
            <option>All</option>
        </select>
    </div>
    <div class="vellum-view-toggle-row">
        <span class="vellum-view-label">View</span>
        <button class="vellum-view-toggle is-active" aria-pressed="true">Cards</button>
        <button class="vellum-view-toggle" aria-pressed="false">List</button>
    </div>
</div>
```

Guidance:

- Use `.vellum-filter-row` for left-side search/filter controls.
- Use `.vellum-view-toggle-row` for display-mode controls.
- Use `.is-active` or `aria-pressed="true"` for the selected view.

Accessibility:

- View toggles are buttons, not links, when they change UI state in place.
- Keep `aria-pressed` in sync when toggles are stateful.

### Cards And Lists

Purpose: show compact pieces of content with quiet metadata and a paper-card feel.

Card markup:

```html
<article class="vellum-card">
    <div class="vellum-card-meta-row">
        <span class="vellum-archive-ref">REF-001</span>
        <div class="vellum-card-meta-right">
            <span class="vellum-archive-date">Today</span>
            <span class="vellum-status vellum-status-warning vellum-status-offset">Open</span>
            <span class="vellum-archive-total">$0.00</span>
        </div>
    </div>
    <h3 class="vellum-archive-card-title">Card title</h3>
    <p class="vellum-archive-card-client">Secondary label</p>
    <div class="vellum-action-row with-rule">
        <button class="vellum-card-action">Copy</button>
        <button class="vellum-card-action vellum-card-action-danger">Remove</button>
    </div>
</article>
```

List row markup:

```html
<article class="vellum-list-row">
    <div>
        <h3 class="vellum-archive-card-title">List row title</h3>
        <span class="vellum-archive-ref">REF-002</span>
    </div>
    <p class="vellum-archive-card-client">Secondary label</p>
    <div class="vellum-action-row">
        <button class="vellum-card-action">Copy</button>
    </div>
</article>
```

Guidance:

- Use `.vellum-card-grid` around cards.
- Use `.vellum-card` for regular cards and `.vellum-card-compact` for grouped, tighter cards.
- Use `.vellum-list-row` when scanning density matters.
- Keep actions secondary; cards should lead with content and metadata.

Accessibility:

- Use `article` when each card can stand alone.
- If the whole card opens a detail view, use a real link or button for that action instead of making only a `div` clickable.

### Status Badges And Seals

Purpose: communicate small status states without heavy color.

Badge:

```html
<span class="vellum-status vellum-status-success">Ready</span>
<span class="vellum-status vellum-status-warning">Open</span>
```

Seal:

```html
<span class="vellum-seal is-active">Cleared</span>
```

Guidance:

- Use badges for inline status.
- Use seals for prominent stamped state.
- Keep badge text short.

Accessibility:

- Status text should be meaningful without color.
- If status changes dynamically, announce it from the consuming project when needed.

### Document Surface

Purpose: create the white paper canvas and document/editor hierarchy.

Markup:

```html
<section class="vellum-document">
    <header class="vellum-document-header">
        <div class="vellum-document-company">
            <h1 class="vellum-company-name">Your Title</h1>
            <p class="vellum-address-text">Supporting lines</p>
        </div>
        <div class="vellum-document-meta">
            <h2 class="vellum-document-title">Document</h2>
            <div class="vellum-meta-group">
                <div class="vellum-meta-row">
                    <span>Issued</span>
                    <span class="vellum-meta-value">Today</span>
                </div>
            </div>
        </div>
    </header>
</section>
```

Guidance:

- Use `.vellum-document` for a framed white content surface.
- Use `.vellum-document-title` for the large low-opacity document label.
- Use `.vellum-meta-group`, `.vellum-meta-row`, and `.vellum-meta-value` for right-aligned compact metadata.

Accessibility:

- Do not use the low-opacity document title as the only page heading.
- Make sure document text still meets the target project's contrast requirements.

### Tables And Totals

Purpose: provide quiet document tables and right-aligned summary panels.

Markup:

```html
<table class="vellum-table">
    <thead>
        <tr class="vellum-table-head-row">
            <th>Item</th>
            <th>Qty</th>
            <th>Total</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Line item</td>
            <td>1</td>
            <td>$100.00</td>
        </tr>
    </tbody>
</table>

<div class="vellum-total-panel">
    <div class="vellum-total-row">
        <span class="vellum-total-label">Subtotal</span>
        <strong class="vellum-total-value">$100.00</strong>
    </div>
</div>
```

Guidance:

- Use semantic tables for tabular data.
- Use `.vellum-total-panel` for compact summary calculations or comparable final summaries.

Accessibility:

- Include table headings.
- Add captions in consuming projects when the table purpose is not obvious from surrounding context.

### Logo Placeholder And Remove Button

Purpose: support small media placeholders and an overlaid remove affordance.

Markup:

```html
<div class="vellum-logo-wrap">
    <label class="vellum-logo-placeholder">
        <span>Logo</span>
    </label>
    <button class="vellum-remove-button" aria-label="Remove logo">x</button>
</div>
```

Guidance:

- Use `.vellum-logo-wrap` to position the remove button.
- Use `.vellum-logo-placeholder` for dashed media drop/upload areas.

Accessibility:

- If the placeholder opens a file picker, connect it to a real file input.
- The remove button needs a clear accessible name.

### Motion And Print

Purpose: preserve the few motion and print utilities that are part of Vellum's feel.

Guidance:

- Use `.vellum-burning` only for removal transitions.
- Use `.vellum-no-print` for controls that should disappear in print.
- Document print rules are scoped and conservative; consuming projects should still test their actual printed content.

Accessibility:

- Do not rely on the burn animation as the only deletion confirmation.
- Consider reduced-motion handling in consuming projects if motion grows beyond this small transition.

## Maturity Checklist

Use this checklist when deciding whether Vellum is ready for broader reuse in a project:

- Component has a documented purpose.
- Component has a copyable markup example.
- Variants and states are named.
- Interactive elements use semantic HTML first.
- Icon-only controls have accessible names.
- Stateful controls expose state with native attributes or ARIA.
- Focus is visible.
- Text labels can be replaced without breaking layout.
- Component does not imply a domain, data model, or feature.
- Component exists in `sample.html` or has a clear reason not to.

## Class Index

This is the raw class inventory by layer. Prefer the component reference above when composing screens, then use this index when you need to locate a specific primitive or helper.

### Tokens

- `:root` variables for colors, fonts, shadows, and interaction lines.
- `.vellum`: scoped wrapper/body equivalent.

### Atoms

- Native scoped element atoms: `h1`-`h6`, `p`, `a`, `strong`, `mark`, `code`, `pre`, `blockquote`, `ul`, `ol`, `li`, `dl`, `dt`, `dd`.
- `.vellum-brand`: serif brand mark.
- `.vellum-kicker`: small mono uppercase context label.
- `.vellum-divider`: small vertical separator.
- `.vellum-tab-link`: small mono nav link.
- `.vellum-nav-tab`: small mono nav tab stack.
- `.vellum-document-title`: low-opacity oversized document label.
- `.vellum-company-name`: `inv-my-company` text stack.
- `.vellum-address-text`: address/supporting text stack.
- `.vellum-recipient-label`: recipient label stack.
- `.vellum-client-name`: recipient name stack.
- `.vellum-input-minimal`: transparent editable field.
- `.vellum-button-pastel`: sage primary button.
- `.vellum-icon-button`: equivalent to the small bordered icon buttons in the toolbar.
- `.vellum-quiet-input`: quiet underline input.
- `.vellum-quiet-select`: quiet underline select.
- `.vellum-archive-search`: archive search input text and spacing stack.
- `.vellum-archive-select`: archive select text and spacing stack.
- `.vellum-view-toggle`: small mono view toggle.
- `.vellum-view-toggle.is-active`: active view state.
- `.vellum-view-label`: small gray `View` label.
- `.vellum-archive-title`: `Your Archive` title stack.
- `.vellum-archive-summary`: archive summary metadata stack.
- `.vellum-search-icon`: subtle search icon treatment.
- `.vellum-group-title`: grouped layout month title.
- `.vellum-group-count`: grouped layout count metadata.
- `.vellum-card-action`: exact `Copy` / `Burn` button text stack.
- `.vellum-archive-card-title`: card title stack.
- `.vellum-archive-card-client`: card client/subtitle stack.
- `.vellum-archive-ref`: card ref metadata stack.
- `.vellum-archive-date`: card date metadata stack.
- `.vellum-archive-total`: card total metadata stack.
- `.vellum-card-meta-row`: card top metadata layout.
- `.vellum-card-meta-right`: right-aligned card metadata column.
- `.vellum-status`: small rounded mono status badge.
- `.vellum-status-success`: green status tint.
- `.vellum-status-warning`: amber status tint.
- `.vellum-status-offset`: status badge spacing used in archive cards.

### Molecules

- `.vellum-brand-cluster`: brand, divider, and small context label row.
- `.vellum-nav-tabs`: nav tab row.
- `.vellum-action-cluster`: primary/icon action row.
- `.vellum-filter-row`: search/filter/sort row.
- `.vellum-search-field`: search label wrapper.
- `.vellum-view-toggle-row`: view toggle flex row.
- `.vellum-group-header`: grouped layout header row.
- `.vellum-card-meta-row`: card top metadata layout.
- `.vellum-card-meta-right`: right-aligned card metadata column.
- `.vellum-action-row`: card action row including hover opacity.
- `.vellum-action-row.with-rule`: card action row with top border.
- `.vellum-meta-row`: right-aligned mono metadata row.
- `.vellum-total-row`: total row layout.
- `.vellum-logo-wrap`: logo container wrapper.

### Organisms

- `.vellum-nav`: sticky translucent top nav.
- `.vellum-nav-inner`: centered nav row.
- `.vellum-archive-toolbar`: filter/search toolbar.
- `.vellum-document`: white document canvas.
- `.vellum-card-grid`: archive card grid.
- `.vellum-card`: archive card treatment.
- `.vellum-card-compact`: compact/grouped card treatment.
- `.vellum-list-row`: list row treatment.
- `.vellum-card-actions`: small mono action row.
- `.vellum-empty-state`: empty/no-match treatment.
- `.vellum-table`: document table styling.
- `.vellum-table-head-row`: table heading row stack.
- `.vellum-total-panel`: right-aligned totals block.
- `.vellum-total-final-label`: serif italic total label.
- `.vellum-footer-note`: footer/terms region.
- `.vellum-footer-section`: payment/bank detail label group.

### Templates

- `.vellum-container`: `max-w-4xl` equivalent container.
- `.vellum-archive-header`: dashboard header vertical stack.
- `.vellum-archive-heading-row`: archive title/actions row.
- `.vellum-document-header`: document header layout.
- `.vellum-document-company`: company side of document header.
- `.vellum-document-meta`: meta side of document header.
- `.vellum-meta-group`: mono metadata stack.
- `.vellum-meta-value`: right-aligned meta input value.
- `.vellum-greeting`: project/note textarea stack.
- `.vellum-burning`: burn-out removal animation.
- `.vellum-no-print`: print visibility helper.

### Pages

- `.vellum-sample-archive-card`: sample card height matching the grouped archive.

### Logo And Status Seal

- `.vellum-logo-placeholder`: logo placeholder.
- `.vellum-remove-button`: small red remove button.
- `.vellum-seal`: stamped status seal.
- `.vellum-seal.is-active`: active seal state.

## Print Notes

The system includes print-safe document rules for A4-style output. It does not globally force print behavior, but keeps `.vellum-no-print` and document print helpers so downstream projects can opt in.

## What Is Not Included

This restart intentionally excludes the previous broad component-library attempt: custom switches, sliders, timelines, toasts, pagination, media objects, and other invented components. Add those only inside a target project when there is a real need.

## License

MIT. See `LICENSE`.
