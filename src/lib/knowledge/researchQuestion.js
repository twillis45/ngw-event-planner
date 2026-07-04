// ─── Research Question Formulation ────────────────────────────────────────────
// Generate research questions FROM the playbook gap definition, not hardcoded templates.
// The playbook already knows what each gap is asking — use that knowledge.

// Generate a research question directly from a gap definition in a playbook
export function generateResearchQuestion(gap, playbook) {
  if (!gap) {
    return {
      question: 'What do we need to research?',
      context: 'Unknown gap',
      keywords: [],
      providers: [],
      details: [],
      source: 'none'
    };
  }

  // The gap definition contains the actual meaning of the question
  const {
    id: gapId,
    label: gapLabel,
    why: gapContext,
    affects: affectsFields,
    options: decisionOptions,
  } = gap;

  // Build research question from the gap's actual definition
  // The "why" explains what we're trying to understand
  const context = gapContext || 'To make an informed decision about this aspect of the event';

  // Generate keywords from the gap's context and options
  const keywords = extractKeywords(gapLabel, gapContext, decisionOptions);

  // Infer provider families from what the gap affects and its nature
  const providers = inferProviderFamilies(gap, playbook);

  // Details should come from the gap's purpose and options
  const details = generateDetailsList(gapLabel, decisionOptions, gapContext);

  return {
    question: `What should we know about ${gapLabel}?`,
    context,
    keywords,
    providers,
    details,
    gapId,
    gapLabel,
    playbook: playbook?.type || 'unknown',
    source: 'playbook-definition' // This comes from the playbook, not a hardcoded template
  };
}

// Extract keywords from the gap's definition
function extractKeywords(label, context, options) {
  const text = `${label || ''} ${context || ''} ${(options || []).join(' ')}`.toLowerCase();

  // Keywords derived from the gap definition itself
  const keywordCandidates = [
    'cost', 'price', 'budget', 'expense',
    'time', 'duration', 'how long',
    'temperature', 'heat', 'cooking', 'steam', 'boil',
    'storage', 'preservation', 'shelf-life',
    'season', 'availability', 'peak', 'harvest',
    'difficulty', 'easy', 'complex', 'skill',
    'seasoning', 'spice', 'cayenne', 'mild', 'hot',
    'quality', 'size', 'quantity', 'portion',
  ];

  return keywordCandidates.filter(kw => text.includes(kw));
}

// Infer which provider families know about this gap
function inferProviderFamilies(gap, playbook) {
  const { label, why, affects } = gap;
  const text = `${label || ''} ${why || ''}`.toLowerCase();

  // Provider specialty inference based on gap characteristics
  const providers = new Set();

  // Safety/cooking/temperature → Food Safety, Government, Academic
  if (text.includes('temperature') || text.includes('cook') || text.includes('boil') || text.includes('steam')) {
    providers.add('Food Safety');
    providers.add('Government');
    providers.add('Academic');
  }

  // Cost/budget/price → Commercial, Industry, Government
  if (text.includes('cost') || text.includes('price') || text.includes('budget') || text.includes('expense')) {
    providers.add('Commercial');
    providers.add('Industry');
    providers.add('Government');
  }

  // Seasoning/flavor/taste → Community, Industry, Commercial
  if (text.includes('season') || text.includes('spice') || text.includes('flavor') || text.includes('taste')) {
    providers.add('Community');
    providers.add('Industry');
    providers.add('Commercial');
  }

  // Timing/logistics → Industry, Commercial, Community
  if (text.includes('time') || text.includes('duration') || text.includes('prepare') || text.includes('when')) {
    providers.add('Industry');
    providers.add('Commercial');
    providers.add('Community');
  }

  // Default: all providers if we can't infer
  if (providers.size === 0) {
    return ['Internal', 'Government', 'Food Safety', 'Commercial', 'Industry', 'Academic', 'Community'];
  }

  return Array.from(providers);
}

// Generate a details list from the gap definition
function generateDetailsList(label, options, context) {
  const details = [];

  // Generic details based on gap type
  if (label?.toLowerCase().includes('cost') || label?.toLowerCase().includes('price')) {
    details.push('Unit cost or price per serving/item');
    details.push('Price range (low to high)');
    details.push('Seasonal or volume variations');
  }

  if (label?.toLowerCase().includes('heat') || label?.toLowerCase().includes('spice')) {
    details.push('Level or intensity options');
    details.push('Guest preferences');
    details.push('Regional or traditional norms');
  }

  if (label?.toLowerCase().includes('time') || label?.toLowerCase().includes('duration')) {
    details.push('Preparation time required');
    details.push('Execution or cooking time');
    details.push('Total timeline');
  }

  if (label?.toLowerCase().includes('size') || label?.toLowerCase().includes('quantity')) {
    details.push('Recommended quantities');
    details.push('Per-guest amounts');
    details.push('How to scale');
  }

  // Add option-based details
  if (options && options.length > 0) {
    details.push(`Comparison of options: ${options.slice(0, 2).join(' vs ')}`);
  }

  // If no details were inferred, add a generic one
  if (details.length === 0) {
    details.push(`What factors affect ${label}?`);
    details.push('Trade-offs and considerations');
  }

  return details;
}

// Score how relevant evidence is to the research question
export function scoreRelevance(evidence, researchQuestion) {
  if (!evidence || !researchQuestion) return 0;

  const { statement, summary, extractedFacts } = evidence;
  const text = `${statement || ''} ${summary || ''}`.toLowerCase();

  // Check keyword matches
  let keywordMatches = 0;
  researchQuestion.keywords.forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  });

  // Check detail matches
  let detailMatches = 0;
  researchQuestion.details.forEach(detail => {
    if (text.includes(detail.toLowerCase())) {
      detailMatches++;
    }
  });

  // Check extracted facts relevance
  const relevantFacts = extractedFacts?.filter(f =>
    researchQuestion.keywords.some(kw => f.fact.toLowerCase().includes(kw.toLowerCase()))
  ).length || 0;

  // Calculate score (0-100)
  const keywordScore = Math.min(keywordMatches * 20, 40); // 0-40 points
  const detailScore = Math.min(detailMatches * 15, 30);   // 0-30 points
  const factScore = Math.min(relevantFacts * 10, 30);     // 0-30 points

  const totalScore = keywordScore + detailScore + factScore;

  return {
    score: Math.min(totalScore, 100),
    keywordMatches,
    detailMatches,
    relevantFactCount: relevantFacts,
    relevance: totalScore >= 70 ? 'direct' : totalScore >= 40 ? 'related' : totalScore >= 20 ? 'tangential' : 'unrelated',
  };
}

// Categorize evidence by relevance
export function categorizeEvidenceRelevance(evidenceList, researchQuestion) {
  const categorized = {
    direct: [],      // Directly answers the question
    related: [],     // Somewhat related
    tangential: [],  // Mentions the topic but not what we need
    unrelated: [],   // About crabs but not this specific question
  };

  evidenceList.forEach(ev => {
    const relevance = scoreRelevance(ev, researchQuestion);
    ev.relevanceScore = relevance.score;
    ev.relevanceLevel = relevance.relevance;

    if (relevance.relevance === 'direct') {
      categorized.direct.push(ev);
    } else if (relevance.relevance === 'related') {
      categorized.related.push(ev);
    } else if (relevance.relevance === 'tangential') {
      categorized.tangential.push(ev);
    } else {
      categorized.unrelated.push(ev);
    }
  });

  return categorized;
}

// Get a helpful message about what's missing
export function whyQuestionUnansswered(researchQuestion, categorizedEvidence) {
  const { direct, related } = categorizedEvidence;

  if (direct.length === 0 && related.length === 0) {
    return {
      problem: 'No relevant evidence found',
      details: [
        `Question: "${researchQuestion.question}"`,
        `Got evidence about: ${Object.keys(categorizedEvidence).map(k => `${k} (${categorizedEvidence[k].length})`).join(', ')}`,
        'But nothing directly answers the research question'
      ],
      suggestion: `Try providers who specialize in: ${researchQuestion.providers.join(', ')}`
    };
  }

  if (direct.length < 2) {
    return {
      problem: 'Only one source answers the question',
      details: [
        `Question: "${researchQuestion.question}"`,
        `Direct evidence: ${direct.length} source`,
        `Related evidence: ${related.length} sources`,
        'Need corroboration from another independent source'
      ],
      suggestion: `Run another campaign with a different provider family`
    };
  }

  return null;
}

// Explain what the campaign is researching
export function campaignExplainerText(campaign, researchQuestion) {
  return {
    title: `Research Campaign: ${campaign.goal}`,
    question: researchQuestion.question,
    why: researchQuestion.context,
    lookingFor: researchQuestion.details,
    providers: researchQuestion.providers,
  };
}
