# see-stylesheet

Minimal, zero-dependency wrapper for working with the CSSOM API.

`SEEStyleSheet` is a superset of the native `CSSStyleSheet` interface that
exposes utility methods for programmatically manipulating stylesheets, especially
useful for working with shadow DOM styles.

SEE is just CSS (see-ess-ess), with more steps.

## Install

```bash
npm install @gradyjasonng/see-stylesheet
```

Requires CSSStyleSheet support [(Chrome 73+, Firefox 101+, Safari 16.4+, Edge 79+)](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/CSSStyleSheet#browser_compatibility).

## Quick start

```ts
import { SEEStyleSheet } from '@gradyjasonng/see-stylesheet';

const sheet = new SEEStyleSheet({
  initialCss: `
    :host { display: block; }
    .title { color: red; }
  `,
});

// Merge in updated styles — matched rules are updated, unmatched are appended
sheet.mergeRules(`
  .title { color: blue; }
  .subtitle { font-size: 0.875rem; }
`);
```

## API

`SEEStyleSheet` extends `CSSStyleSheet`, so it inherits its full interface
including `insertRule()`, `deleteRule()`, `replaceSync()`, and `cssRules`.
It adds the following:

### `new SEEStyleSheet(options?)`

Accepts the same options as `CSSStyleSheet`, plus:

| Option | Type | Description |
|---|---|---|
| `initialCss` | `string` | CSS text to parse into the sheet on construction. Supports multiple rules. |

```ts
const sheet = new SEEStyleSheet({
  initialCss: `
    .foo { margin: 2px; }
    .bar { background-color: tomato; }
  `,
});
```

### `sheet.mergeRules(css)`

Parses `css` into rules and merges each one into the sheet. Returns `this` for chaining.

**Matching rules are updated in place** — declarations are overwritten by the
incoming values, and any declarations not present in the incoming rule are left
unchanged. Unmatched rules are appended.

Merging is recursive: nested at-rules and CSS-nested style rules are walked and
merged at every level.

```ts
const sheet = new SEEStyleSheet({
  initialCss: `
    .card { color: red; padding: 8px; }
    @media (max-width: 600px) { .card { padding: 4px; } }
  `,
});

sheet.mergeRules(`
  .card { color: blue; }
  @media (max-width: 600px) { .card { padding: 2px; } }
  .new-rule { display: grid; }
`);

// Result:
//   .card { color: blue; padding: 8px; }           — color overwritten, padding preserved
//   @media (max-width: 600px) { .card { padding: 2px; } }  — nested rule updated
//   .new-rule { display: grid; }                   — appended (no prior match)
```

Rules are matched by type and a stable identity key:

| Rule type | Identity key |
|---|---|
| `CSSStyleRule` | `selectorText` |
| `CSSMediaRule` / `CSSSupportsRule` | `conditionText` |
| `CSSLayerBlockRule` | `name` |
| `CSSKeyframesRule` | `name` |
| `CSSKeyframeRule` | `keyText` |

## Testing

```bash
npm test          # build and run all tests in Chromium
npm run test:watch  # rebuild on change and re-run
```

## License

MIT
