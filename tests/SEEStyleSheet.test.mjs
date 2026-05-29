import { describe, expect, test } from 'vitest';

import { findMatchingRuleIndex, getRuleIdentity } from '../dist/utils.js';
import { SEEStyleSheet } from '../dist/index.js';

function sheet(strings, ...values) {
  const cssText = strings.reduce((acc, str, i) => acc + (values[i - 1] ?? '') + str);
  const s = new CSSStyleSheet();
  s.replaceSync(cssText);
  return s;
}

describe('merge utilities', () => {
  test('getRuleIdentity identifies all rule types', () => {
    const styleRule = sheet`.title { color: red; }`.cssRules.item(0);
    const mediaRule = sheet`@media (max-width: 600px) { .x { color: red; } }`.cssRules.item(0);
    const keyframesRule = sheet`@keyframes fade { from { opacity: 0; } to { opacity: 1; } }`.cssRules.item(0);
    const keyframeRule = keyframesRule.cssRules[0];
    const layerRule = sheet`@layer utilities { .u { display: block; } }`.cssRules.item(0);

    expect(getRuleIdentity(styleRule)).toBe('CSSStyleRule|.title');
    expect(getRuleIdentity(mediaRule)).toBe('CSSMediaRule|(max-width: 600px)');
    expect(getRuleIdentity(keyframesRule)).toBe('CSSKeyframesRule|fade');
    // Chrome normalizes 'from' -> '0%'
    expect(getRuleIdentity(keyframeRule)).toBe('CSSKeyframeRule|0%');
    expect(getRuleIdentity(layerRule)).toBe('CSSLayerBlockRule|utilities');
  });

  test('findMatchingRuleIndex returns the matching index or -1', () => {
    const s = sheet`.a { color: red; } .b { color: blue; }`;
    const targetFound = sheet`.b { color: green; }`.cssRules.item(0);
    const targetMissing = sheet`.c { color: green; }`.cssRules.item(0);

    expect(findMatchingRuleIndex(s.cssRules, targetFound)).toBe(1);
    expect(findMatchingRuleIndex(s.cssRules, targetMissing)).toBe(-1);
  });
});

describe('SEEStyleSheet', () => {
  test('constructor with initialCss populates cssRules', () => {
    const sheet = new SEEStyleSheet({ initialCss: '.title { color: red; }' });

    expect(sheet.cssRules.length).toBe(1);
    expect(sheet.cssRules.item(0).cssText).toContain('.title');
    expect(sheet.cssRules.item(0).cssText).toContain('color: red');
  });

  test('mergeRules appends unmatched rules at the top level and within at-rules', () => {
    // Top-level insertion
    const sheet = new SEEStyleSheet({ initialCss: '.a { color: red; }' });
    sheet.mergeRules('.b { display: block; }');
    expect(sheet.cssRules.length).toBe(2);
    const topSelectors = Array.from(sheet.cssRules).map((r) => r.selectorText);
    expect(topSelectors).toContain('.a');
    expect(topSelectors).toContain('.b');

    // Insertion within an at-rule
    const mediaSheet = new SEEStyleSheet({
      initialCss: '@media (max-width: 600px) { .old { color: red; } }',
    });
    mediaSheet.mergeRules('@media (max-width: 600px) { .new-rule { color: purple; } }');
    const mediaRule = mediaSheet.cssRules.item(0);
    const nestedSelectors = Array.from(mediaRule.cssRules).map((r) => r.selectorText);
    expect(nestedSelectors).toContain('.old');
    expect(nestedSelectors).toContain('.new-rule');
  });

  test('mergeRules overwrites matching declarations and preserves untouched ones', () => {
    const sheet = new SEEStyleSheet({ initialCss: '.a { color: red; margin: 0px; }' });
    sheet.mergeRules('.a { color: blue; display: block; }');

    const rule = sheet.cssRules.item(0);
    expect(rule.style.getPropertyValue('color')).toBe('blue');    // overwritten
    expect(rule.style.getPropertyValue('margin')).toBe('0px');    // preserved
    expect(rule.style.getPropertyValue('display')).toBe('block'); // new property
  });

  test('mergeRules recursively merges matching at-rules and CSS-nested style rules', () => {
    const sheet = new SEEStyleSheet({
      initialCss: '@media (max-width: 600px) { .card { color: red; & .child { color: blue; } } }',
    });
    sheet.mergeRules('@media (max-width: 600px) { .card { color: green; padding: 8px; & .child { color: yellow; } } }');

    const mediaRule = sheet.cssRules.item(0);
    const cardRule = mediaRule.cssRules.item(0);
    const childRule = cardRule.cssRules.item(0);

    expect(cardRule.style.getPropertyValue('color')).toBe('green');
    expect(cardRule.style.getPropertyValue('padding')).toBe('8px');
    expect(childRule.style.getPropertyValue('color')).toBe('yellow');
  });
});
