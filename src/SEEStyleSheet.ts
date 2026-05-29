import { findMatchingRuleIndex, mergeRule, parseCSSIntoSheet } from './utils.js';

export interface SEEStyleSheetInit extends CSSStyleSheetInit {
  /**
   * Initial CSS text to populate the sheet with.
   */
  initialCss?: string;
}

/**
 * `SEEStyleSheet` is a superset of the browser's native `CSSStyleSheet`.
 */
export class SEEStyleSheet extends CSSStyleSheet {

  constructor(options: SEEStyleSheetInit = {}) {
    super(options);
    if (options.initialCss) {
      this.replaceSync(options.initialCss);
    }
  }

  /**
   * Merges the CSS string into the sheet. Multiple rules will be parsed and 
   * merged individually. Unmatched rules are inserted as new rules.
   * @param rules - CSS text containing one or more rules to merge into the sheet.
   * @returns The current instance for chaining.
   */
  mergeRules(rules: string): this {
    const incomingSheet = parseCSSIntoSheet(rules);
    let cursor = this.cssRules.length;

    for (let index = 0; index < incomingSheet.cssRules.length; index++) {
      const incomingRule = incomingSheet.cssRules.item(index);
      if (!incomingRule) {
        continue;
      }

      const matchedIndex = findMatchingRuleIndex(this.cssRules, incomingRule);
      if (matchedIndex === -1) {
        this.insertRule(incomingRule.cssText, cursor);
        cursor += 1;
        continue;
      }

      const existingRule = this.cssRules.item(matchedIndex);
      if (!existingRule) {
        continue;
      }

      mergeRule(existingRule, incomingRule);
    }

    return this;
  }
}
