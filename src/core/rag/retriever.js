import corpusData from "./corpus.json" with { type: "json" };

/**
 * Standard English stopwords to filter during BM25 indexing and querying.
 */
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
  "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
  "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
  "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
  "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
  "yourself", "yourselves",
]);

/**
 * Tokenize raw text into normalized words, stems, and key tokens.
 * Extracts amounts (e.g. "15000", "1lakh"), emails, URLs, and words.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  if (!text || typeof text !== "string") return [];

  // Normalize currency symbols, commas in numbers, and common spacing
  const normalized = text
    .toLowerCase()
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/[₹]/g, " rs ")
    .replace(/@([a-z0-9.-]+\.[a-z]{2,})/g, " domain_$1 ")
    .replace(/https?:\/\/[^\s]+/g, (url) => {
      if (url.includes("forms.gle") || url.includes("docs.google.com/forms")) return " token_google_form ";
      if (url.includes("t.me") || url.includes("telegram")) return " token_telegram ";
      if (url.includes("bit.ly") || url.includes("tinyurl.com")) return " token_shortlink ";
      return " token_url ";
    });

  // Extract alphanumeric tokens
  const rawTokens = normalized.match(/[a-z0-9_]{2,}/g) || [];

  return rawTokens.filter((token) => !STOPWORDS.has(token));
}

/**
 * Precompute BM25 inverted index for the given corpus.
 *
 * @param {Array<{ id: string, type: string, category: string, description: string, text: string }>} corpus
 */
export function buildIndex(corpus) {
  const N = corpus.length;
  const docTokens = [];
  const docFreqs = new Map(); // term -> count of docs containing term
  let totalDocLength = 0;

  for (let i = 0; i < N; i++) {
    const tokens = tokenize(`${corpus[i].category} ${corpus[i].description} ${corpus[i].text}`);
    docTokens.push(tokens);
    totalDocLength += tokens.length;

    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      docFreqs.set(term, (docFreqs.get(term) || 0) + 1);
    }
  }

  const avgDocLength = totalDocLength / (N || 1);

  // Precompute IDF for each term: ln(1 + (N - df + 0.5)/(df + 0.5))
  const idfMap = new Map();
  for (const [term, df] of docFreqs.entries()) {
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    idfMap.set(term, idf);
  }

  return {
    corpus,
    N,
    docTokens,
    docFreqs,
    idfMap,
    avgDocLength,
  };
}

// Global in-memory index built once at module load
const defaultIndex = buildIndex(corpusData);

/**
 * Extract semantic domain features for query and chunks.
 */
function extractFeatures(text) {
  const lower = text.toLowerCase();
  return {
    hasFee: /fee|deposit|refundable|pay|payment|charge|cost|amount/i.test(lower),
    hasAadhaarOrPan: /aadhaar|aadhar|pan card|pan number|bank account|ifsc/i.test(lower),
    hasHighStipend: /(?:1\s*lakh|1\.5\s*lakh|1,10,000|1,50,000|100000|75,000|80,000)/i.test(lower),
    hasTelegramOrWhatsApp: /telegram|whatsapp|wa\.me/i.test(lower),
    hasForm: /google form|forms\.gle|fill the form/i.test(lower),
    hasGovt: /ministry|niti|nic|government|govt/i.test(lower),
  };
}

/**
 * Retrieve top-K relevant precedents from the corpus using BM25 + Semantic Feature Boosting.
 *
 * @param {string} queryText - Candidate message to analyze
 * @param {Object} [options]
 * @param {number} [options.limit=3] - Number of precedents to return
 * @param {Object} [options.index=defaultIndex] - Custom index for testing
 * @returns {Array<{ id: string, type: string, category: string, description: string, score: number, text: string }>}
 */
export function retrievePrecedents(queryText, options = {}) {
  const limit = options.limit || 3;
  const index = options.index || defaultIndex;
  const { corpus, docTokens, idfMap, avgDocLength } = index;

  if (!queryText || typeof queryText !== "string") {
    return [];
  }

  const queryTokens = tokenize(queryText);
  if (queryTokens.length === 0) {
    return [];
  }

  const queryFeatures = extractFeatures(queryText);

  // Term frequencies in the query
  const queryTermCounts = new Map();
  for (const t of queryTokens) {
    queryTermCounts.set(t, (queryTermCounts.get(t) || 0) + 1);
  }

  const k1 = 1.5;
  const b = 0.75;
  const scored = [];

  for (let docIdx = 0; docIdx < index.N; docIdx++) {
    const dTokens = docTokens[docIdx];
    const docLength = dTokens.length;

    // Document term frequencies
    const docTermFreq = new Map();
    for (const t of dTokens) {
      docTermFreq.set(t, (docTermFreq.get(t) || 0) + 1);
    }

    let bm25Score = 0;

    for (const [qTerm] of queryTermCounts.entries()) {
      const tf = docTermFreq.get(qTerm) || 0;
      if (tf > 0) {
        const idf = idfMap.get(qTerm) || 0;
        const normTf = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength)));
        bm25Score += idf * normTf;
      }
    }

    // Semantic Feature Boosting
    const chunk = corpus[docIdx];
    const chunkFeatures = extractFeatures(`${chunk.category} ${chunk.description} ${chunk.text}`);
    let featureBoost = 0;

    if (queryFeatures.hasFee && chunkFeatures.hasFee) {
      featureBoost += 2.5;
    }
    if (queryFeatures.hasAadhaarOrPan && chunkFeatures.hasAadhaarOrPan) {
      featureBoost += 2.5;
    }
    if (queryFeatures.hasHighStipend && chunkFeatures.hasHighStipend) {
      featureBoost += 2.0;
    }
    if (queryFeatures.hasTelegramOrWhatsApp && chunkFeatures.hasTelegramOrWhatsApp) {
      featureBoost += 1.0;
    }
    if (queryFeatures.hasForm && chunkFeatures.hasForm) {
      featureBoost += 1.2;
    }
    if (queryFeatures.hasGovt && chunkFeatures.hasGovt) {
      featureBoost += 2.0;
    }

    const finalScore = bm25Score + featureBoost;

    if (finalScore > 0) {
      scored.push({
        id: chunk.id,
        type: chunk.type,
        category: chunk.category,
        description: chunk.description,
        score: Math.round(finalScore * 100) / 100,
        text: chunk.text,
      });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Return top matches, striving for balance if top score is ambiguous
  const topMatches = scored.slice(0, limit);

  // If all top matches are of one type (e.g. all scams) and there is a relevant opposite type within top 6,
  // ensure at least 1 contrasting precedent is present so the LLM has both perspectives.
  const hasScam = topMatches.some((m) => m.type === "scam");
  const hasGenuine = topMatches.some((m) => m.type === "genuine");

  if (topMatches.length >= 2 && (!hasScam || !hasGenuine) && scored.length > limit) {
    const missingType = !hasScam ? "scam" : "genuine";
    const contrastMatch = scored.slice(limit, limit + 4).find((m) => m.type === missingType && m.score > 2.0);
    if (contrastMatch) {
      topMatches[topMatches.length - 1] = contrastMatch;
      topMatches.sort((a, b) => b.score - a.score);
    }
  }

  return topMatches;
}

export { defaultIndex };
