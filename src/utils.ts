
type RuleParent = CSSStyleSheet | CSSGroupingRule | CSSKeyframesRule;

export function parseCSSIntoSheet(cssText: string): CSSStyleSheet {
  const scratch = new CSSStyleSheet();
  scratch.replaceSync(cssText);
  return scratch;
}


export function getRuleIdentity(rule: CSSRule): string {
  // We can identify rules by their type + some stable aspect of their
  // definition (i.e. **not** the style declarations)
  // The heuristic used below is:
  // StyleRule: selectorText
  // KeyframeRule: keyText
  // ConditionRule: conditionText

  const ruleType = rule.constructor.name;

  switch (rule.constructor.name) {
    case 'CSSStyleRule':
      return `${ruleType}|${(rule as CSSStyleRule).selectorText}`;
    case 'CSSKeyframeRule':
      return `${ruleType}|${(rule as CSSKeyframeRule).keyText}`;
    case 'CSSMediaRule':
    case 'CSSSupportsRule':
      return `${ruleType}|${(rule as CSSConditionRule).conditionText}`;
    case 'CSSLayerBlockRule':
      return `${ruleType}|${(rule as CSSLayerBlockRule).name}`;
    default:
      // For unsupported/opaque rule types, we try to fall back on a `name`
      // property if it exists, otherwise we just return the constructor name.
      if ('name' in rule && typeof rule.name === 'string') {
        return `${ruleType}|${rule.name}`;
      }
      return `${rule.constructor.name}`;
  }
}

export function findMatchingRuleIndex(ruleList: CSSRuleList, rule: CSSRule): number {
  const identity = getRuleIdentity(rule);
  for (let index = 0; index < ruleList.length; index++) {
    const candidate = ruleList.item(index);
    if (candidate && getRuleIdentity(candidate) === identity) {
      return index;
    }
  }

  return -1;
}

export function mergeRule(existingRule: CSSRule, incomingRule: CSSRule): void {
  if (existingRule.constructor.name !== incomingRule.constructor.name) {
    console.warn('Attempting to merge rules of different types. This may lead to unexpected results.', { existingRule, incomingRule });
  }

  const hasChildRules = 'cssRules' in incomingRule;
  const hasStyleDeclaration = 'style' in incomingRule;

  if (hasStyleDeclaration) {
    mergeDeclarations((existingRule as CSSStyleRule).style, (incomingRule as CSSStyleRule).style);
  }

  if (hasChildRules) {
    mergeChildRules(existingRule as RuleParent, incomingRule as RuleParent);
    return;
  }

  if (hasStyleDeclaration) {
    return;
  }

  // Fallback for unsupported/opaque rule types.
  if (existingRule.parentStyleSheet) {
    replaceRuleInParent(existingRule.parentStyleSheet, existingRule, incomingRule.cssText);
  }
}

export function mergeChildRules(existingParent: RuleParent, incomingParent: RuleParent): void {
  for (let index = 0; index < incomingParent.cssRules.length; index++) {
    const incomingChild = incomingParent.cssRules.item(index);
    if (!incomingChild) {
      continue;
    }

    const matchedIndex = findMatchingRuleIndex(existingParent.cssRules, incomingChild);
    if (matchedIndex === -1) {
      insertChildRule(existingParent, incomingChild.cssText);
      continue;
    }

    const existingChild = existingParent.cssRules.item(matchedIndex);
    if (!existingChild) {
      continue;
    }

    mergeRule(existingChild, incomingChild);
  }
}

export function insertChildRule(parent: RuleParent, ruleText: string): void {
  if (parent.constructor.name === 'CSSKeyframesRule') {
    (parent as CSSKeyframesRule).appendRule(ruleText);
    return;
  }

  (parent as CSSGroupingRule | CSSStyleSheet).insertRule(ruleText, parent.cssRules.length);
}

export function mergeDeclarations(existingStyle: CSSStyleDeclaration, incomingStyle: CSSStyleDeclaration): void {
  for (let index = 0; index < incomingStyle.length; index++) {
    const property = incomingStyle.item(index);
    if (!property) {
      continue;
    }

    const incomingValue = incomingStyle.getPropertyValue(property);
    const incomingPriority = incomingStyle.getPropertyPriority(property);

    existingStyle.setProperty(property, incomingValue, incomingPriority);
  }
}

export function replaceRuleInParent(parent: CSSStyleSheet, targetRule: CSSRule, nextRuleText: string): void {
  for (let index = 0; index < parent.cssRules.length; index++) {
    const candidate = parent.cssRules.item(index);
    if (candidate !== targetRule) {
      continue;
    }

    parent.deleteRule(index);
    parent.insertRule(nextRuleText, index);
    return;
  }
}
