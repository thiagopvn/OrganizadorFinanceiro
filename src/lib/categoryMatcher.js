/**
 * Category Matcher — classifies OFX MEMO descriptions into app categories.
 * Uses keyword-based matching with priority ordering.
 * Supports Brazilian merchant names (Nubank, Itaú, Bradesco, etc.)
 */

// Each rule: [array of keywords/patterns, category, transactionType]
// Order matters — first match wins. More specific patterns come first.
const RULES = [
  // ─── Transporte ─────────────────────────────────────────────
  [['uber', 'uberrides', '99app', '99 ride', '99ride', 'dl*99', 'dl *99', 'cabify', 'lyft', 'indriver', 'moovit', 'google moovit', 'buser', 'clickbus'], 'transporte', 'expense'],

  // ─── Restaurante / Alimentação fora ─────────────────────────
  [['ifood', 'rappi', 'zé delivery', 'ze delivery', 'aiqfome', 'mcdonald', 'burger king', 'bk *', 'subway', 'outback', 'madero', 'starbucks', 'sushi', 'pizz', 'restauran', 'lanchonete', 'lanch', 'padaria', 'panificac', 'confeitaria', 'gourmet', 'baciodilatte', 'habib', 'china in box', 'dominos', 'kfc', 'popeyes', 'giraffas', 'coco bambu', 'spoleto', 'bob\'s', 'ryo sushi', 'deliv', 'burguer', 'plaza rest', 'fr ilha plaza rest'], 'restaurante', 'expense'],

  // ─── Mercado / Supermercado ─────────────────────────────────
  [['supermercado', 'mercado', 'assai', 'atacadao', 'atacadão', 'carrefour', 'extra hiper', 'pao de acucar', 'pão de açúcar', 'mundial', 'guanabara', 'hortifruti', 'sacolao', 'sacolão', 'natural da terra', 'oba hortifruti', 'sam\'s club', 'makro', 'fort atacadista', 'bistek', 'condor', 'prezunic', 'dia supermercado', 'big bompreco'], 'mercado', 'expense'],

  // ─── Assinaturas / Serviços digitais ────────────────────────
  [['netflix', 'spotify', 'disney', 'hbo', 'prime video', 'amazonprime', 'apple tv', 'youtube premium', 'youtube music', 'deezer', 'tidal', 'crunchyroll', 'paramount', 'star+', 'globoplay', 'telecine', 'ifood club', 'rappi prime', 'claude.ai', 'chatgpt', 'openai', 'perplexity', 'midjourney', 'notion', 'canva', 'adobe', 'figma', 'github', 'railway', 'vercel', 'heroku', 'aws', 'google one', 'google youtube', 'icloud', 'dropbox', 'onedrive', 'microsoft', 'locaweb', 'hostgator', 'godaddy', 'cloudflare', 'juridico ai', 'dl*google youtub', 'dl*google chatgp', 'dl*google google', 'dm *spotify', 'dm*spotify', 'subscription'], 'assinatura', 'expense'],

  // ─── Saúde ──────────────────────────────────────────────────
  [['farmacia', 'farmácia', 'drogaria', 'drogasil', 'droga raia', 'drogasmil', 'panvel', 'ultrafarma', 'hospital', 'clinica', 'clínica', 'laboratorio', 'laboratório', 'dentista', 'odonto', 'psicologo', 'psicólogo', 'psiquiatr', 'fisioter', 'nutricion', 'terapia', 'consulta medica', 'plano de saude', 'unimed', 'amil', 'sulamerica', 'bradesco saude', 'oboticario', 'boticário', 'biana dutra', 'pastore assist', 'ser psicologo', 'brapsi', 'esquadraofit', 'yazio', 'google yazio', 'google flo health', 'flo health', 'appesquadraofit', 'smartfit', 'smart fit', 'sky fit', 'skyfit', 'academia', 'gym', 'fitness', 'dumbbell', 'unity fitness'], 'saude', 'expense'],

  // ─── Educação ───────────────────────────────────────────────
  [['educacao', 'educação', 'escola', 'faculdade', 'universidade', 'curso', 'udemy', 'coursera', 'alura', 'rocketseat', 'origamid', 'gran educacao', 'leiturinha', 'leiturariocomerci', 'livraria', 'livro', 'saraiva', 'cultura', 'amazon kindle', 'hotmart', 'eduzz', 'clipping cacd', 'pg *clipping', 'descomplica', 'aprova total', 'vestibular'], 'educacao', 'expense'],

  // ─── Compras / Shopping ─────────────────────────────────────
  [['amazon', 'amazonmktplc', 'mercadolivre', 'mercado livre', 'shopee', 'shein', 'aliexpress', 'wish', 'magazineluiza', 'magalu', 'casas bahia', 'americanas', 'submarino', 'ponto frio', 'centauro', 'netshoes', 'zattini', 'renner', 'riachuelo', 'c&a', 'cea', 'marisa', 'hering', 'dafiti', 'zaful', 'ikea', 'tok stok', 'etna', 'leroy merlin', 'loja', 'calcados', 'calçados', 'modas', 'moda ', 'roupas', 'confeccoes', 'confecções', 'elo7', 'bela ferraz', 'vou comprar', 'ilha plaza', 'ilha shopping', 'ilha drive', 'top baby', 'foxbrinquedos', 'papelaria', 'gipapelariaper', 'distribuidoraf', 'underpax', 'newlook', 'sh ilha', 'p k k', 'engageele', 'scscomerc', 'vividbuys', 'hoaglobal', 'eventodoity', 'zamak', 'comercio varejist', 'bell art', 'domilhaproducao', 'maneco com', 'drp 2015', 'ark comercio', 'dock roupas', 'mariettas', 'modernatta', 'emporiomix', 'lider da ilha', 'lojinhadonemo', 'marlibabyenxov', 'eprisan'], 'compras', 'expense'],

  // ─── Lazer / Entretenimento ─────────────────────────────────
  [['cinema', 'cinemark', 'ingresso', 'sympla', 'teatro', 'show', 'parque', 'museu', 'zoo', 'aquario', 'beach park', 'hopi hari', 'beto carrero', 'game', 'brawl', 'google brawl', 'google mob control', 'mob control', 'playstation', 'xbox', 'nintendo', 'steam', 'epic games', 'riot'], 'lazer', 'expense'],

  // ─── Viagem ─────────────────────────────────────────────────
  [['airbnb', 'booking', 'hotel', 'hostel', 'pousada', 'latam', 'gol linhas', 'azul linhas', 'decolar', 'hurb', '123milhas', 'cvc viagens', 'passagem', 'aeroporto', 'mala', 'duty free'], 'viagem', 'expense'],

  // ─── Moradia ────────────────────────────────────────────────
  [['aluguel', 'condominio', 'condomínio', 'iptu', 'luz', 'energia', 'enel', 'cemig', 'cpfl', 'copel', 'celesc', 'gas', 'gás', 'comgas', 'agua', 'água', 'sabesp', 'cedae', 'internet', 'claro', 'vivo', 'tim s a', 'tim s/a', 'oi fibra', 'net virtua'], 'moradia', 'expense'],

  // ─── Investimento ───────────────────────────────────────────
  [['investimento', 'tesouro direto', 'cdb', 'lci', 'lca', 'fundo', 'acao', 'ação', 'xp investimentos', 'rico', 'clear', 'nuinvest', 'btg', 'inter invest', 'binance', 'bitcoin', 'cripto', 'crypto'], 'investimento', 'expense'],

  // ─── Freelance / Renda extra ────────────────────────────────
  [['99freelas', 'freelancer', 'workana', 'fiverr', 'upwork'], 'freelance', 'expense'],

  // ─── Presente ───────────────────────────────────────────────
  [['presente', 'gift', 'floricultura', 'flores'], 'presente', 'expense'],
]

// IOF and estorno patterns — mark as the same category of the original transaction or 'outros'
const SKIP_PATTERNS = ['iof de', 'estorno de']

/**
 * Clean and normalize memo text for matching
 */
function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[*_\-."']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Classify a single OFX transaction memo into a category.
 * @param {string} memo - Transaction description from OFX
 * @param {number} amount - Signed amount (negative=expense, positive=income)
 * @param {object} options - Extra context
 * @param {string} options.accountType - 'credit_card' or 'checking'
 * Returns { category, transactionType, isBillPayment }
 */
export function classifyTransaction(memo, amount, options = {}) {
  const normalized = normalize(memo)
  const isCreditCard = options.accountType === 'credit_card'

  // Handle IOF charges — classify as the referenced transaction's category (always expense)
  if (normalized.startsWith('iof de ')) {
    const referenced = normalized.replace('iof de ', '').replace(/^"/, '').replace(/"$/, '')
    const result = matchRules(referenced)
    return result ? { ...result, transactionType: 'expense' } : { category: 'outros', transactionType: 'expense' }
  }

  // Handle estornos (refunds) — keep same category, determine type by amount sign
  if (normalized.startsWith('estorno de ')) {
    const referenced = normalized.replace('estorno de ', '').replace(/^"/, '').replace(/"$/, '')
    const result = matchRules(referenced)
    const txType = amount >= 0 ? 'income' : 'expense'
    return result ? { ...result, transactionType: txType } : { category: 'outros', transactionType: txType }
  }

  // Positive amounts (credits) — all treated as income
  if (amount > 0) {
    // Real income patterns
    if (normalized.includes('salario') || normalized.includes('salário') ||
        normalized.includes('pagamento recebido') ||
        normalized.includes('deposito') || normalized.includes('depósito') ||
        normalized.includes('transferencia recebida') || normalized.includes('pix recebido') ||
        normalized.includes('ted recebida') || normalized.includes('doc recebid')) {
      return { category: 'salario', transactionType: 'income' }
    }
    if (normalized.includes('freelan') || normalized.includes('99freelas') || normalized.includes('workana')) {
      return { category: 'freelance', transactionType: 'income' }
    }
    // Generic positive amount — income
    return { category: 'outros', transactionType: 'income' }
  }

  // Expense classification
  const result = matchRules(normalized)
  return result || { category: 'outros', transactionType: 'expense' }
}

/**
 * Match normalized text against rule set.
 * Keywords are also normalized to ensure consistent matching.
 */
function matchRules(normalized) {
  for (const [keywords, category, txType] of RULES) {
    for (const kw of keywords) {
      // Normalize the keyword the same way we normalize the memo
      const normalizedKw = kw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[*_\-."']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (normalized.includes(normalizedKw)) {
        return { category, transactionType: txType }
      }
    }
  }
  return null
}

/**
 * Extract a clean description from OFX memo.
 * Removes "Parcela X/Y" suffix and cleans up prefixes.
 */
export function cleanDescription(memo) {
  if (!memo) return ''

  let desc = memo
    // Remove "- Parcela X/Y" suffix
    .replace(/\s*-\s*Parcela\s+\d+\/\d+$/i, '')
    // Clean common prefixes
    .replace(/^Dl\s*\*/i, '')
    .replace(/^Dm\s*\*/i, '')
    .replace(/^Ifd\s*\*/i, '')
    .replace(/^Pg\s*\*/i, '')
    .replace(/^Ec\s*\*/i, '')
    .replace(/^Htm\s*\*/i, '')
    .replace(/^Hna\s*\*/i, '')
    .replace(/^Zp\s*\*/i, '')
    .replace(/^Mp\s*\*/i, '')
    .replace(/^Ppro\s*\*/i, '')
    .replace(/^Pag\s*\*/i, '')
    .trim()

  // Capitalize first letter
  if (desc.length > 0) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1)
  }

  return desc
}

/**
 * Extract installment info from memo if present
 * Returns { current, total } or null
 */
export function extractInstallment(memo) {
  if (!memo) return null
  const match = memo.match(/Parcela\s+(\d+)\/(\d+)/i)
  if (!match) return null
  return { current: parseInt(match[1]), total: parseInt(match[2]) }
}

/**
 * Process a batch of raw OFX transactions into app-ready format.
 * @param {Array} rawTransactions - Parsed OFX transactions
 * @param {object} options - Extra context from parsed OFX file
 * @param {string} options.accountType - 'credit_card' or 'checking'
 *
 * Each output has: description, amount, category, transactionType, date, memo (original),
 * fitId, installment, isIOF, isEstorno, isBillPayment
 */
export function processTransactions(rawTransactions, options = {}) {
  return rawTransactions.map(tx => {
    const result = classifyTransaction(tx.memo, tx.amount, options)
    const description = cleanDescription(tx.memo)
    const installment = extractInstallment(tx.memo)
    const normalizedMemo = tx.memo.toLowerCase()

    return {
      description,
      amount: tx.amount,
      category: result.category,
      transactionType: result.transactionType,
      date: tx.date,
      memo: tx.memo, // original OFX memo
      fitId: tx.fitId,
      installment,
      isIOF: normalizedMemo.startsWith('iof de '),
      isEstorno: normalizedMemo.startsWith('estorno de '),
    }
  })
}
