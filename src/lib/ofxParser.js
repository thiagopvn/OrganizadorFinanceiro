/**
 * OFX Parser — parses both OFXSGML (v1) and OFX XML (v2) formats.
 * Compatible with Nubank, Itaú, Bradesco, Santander, Inter, C6, and other BR banks.
 * Returns structured data: bank info, account, date range, and transaction list.
 */

/**
 * Pre-process OFX content to handle encoding and format differences.
 * - Strips BOM
 * - Normalizes line endings
 * - Handles both SGML and XML styles
 */
function preprocessOFX(raw) {
  return raw
    .replace(/^\uFEFF/, '')          // strip BOM
    .replace(/\r\n/g, '\n')          // normalize line endings
    .replace(/\r/g, '\n')
}

/**
 * Parse OFX date string like "20251231000000[-3:BRT]" → JS Date
 * Handles: YYYYMMDD, YYYYMMDDHHmmss, YYYYMMDD[-3:BRT], etc.
 */
function parseOFXDate(raw) {
  if (!raw) return null
  // Strip timezone info in brackets
  const clean = raw.replace(/\[.*\]/, '').trim()
  if (clean.length < 8) return null

  const y = parseInt(clean.substring(0, 4))
  const m = parseInt(clean.substring(4, 6)) - 1
  const d = parseInt(clean.substring(6, 8))
  const h = clean.length >= 10 ? parseInt(clean.substring(8, 10)) : 0
  const min = clean.length >= 12 ? parseInt(clean.substring(10, 12)) : 0
  const s = clean.length >= 14 ? parseInt(clean.substring(12, 14)) : 0

  const date = new Date(y, m, d, h, min, s)
  // Validate parsed date
  if (isNaN(date.getTime())) return null
  return date
}

/**
 * Extract tag value from OFX content.
 * Supports both SGML style (<TAG>value\n) and XML style (<TAG>value</TAG>).
 * Also handles self-closing tags and whitespace variations.
 */
function getTagValue(content, tag) {
  // Try closed tag first: <TAG>value</TAG>
  const closedRe = new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`, 'i')
  const closedMatch = content.match(closedRe)
  if (closedMatch) return closedMatch[1].trim()

  // Try open tag (SGML style): <TAG>value followed by newline or next tag
  const openRe = new RegExp(`<${tag}>([^<\\n\\r]+)`, 'i')
  const openMatch = content.match(openRe)
  if (openMatch) return openMatch[1].trim()

  return null
}

/**
 * Parse all <STMTTRN> blocks from OFX content.
 * Handles both bank (BANKMSGSRSV1) and credit card (CREDITCARDMSGSRSV1) statements.
 * Some banks use <NAME> instead of <MEMO> — we check both.
 */
function parseTransactions(content) {
  const transactions = []
  // Split on <STMTTRN> — works for both SGML and XML
  const blocks = content.split(/<STMTTRN>/i).slice(1)

  for (const block of blocks) {
    // Find end of transaction block (case-insensitive)
    const endIdx = block.search(/<\/STMTTRN>/i)
    const chunk = endIdx >= 0 ? block.substring(0, endIdx) : block

    const trnType = getTagValue(chunk, 'TRNTYPE')
    const dtPosted = getTagValue(chunk, 'DTPOSTED')
    const trnAmt = getTagValue(chunk, 'TRNAMT')
    const fitId = getTagValue(chunk, 'FITID')
    // Some banks (Itaú, Bradesco) use <NAME>, Nubank uses <MEMO>
    const memo = getTagValue(chunk, 'MEMO') || getTagValue(chunk, 'NAME') || ''
    const checkNum = getTagValue(chunk, 'CHECKNUM') // some banks use this

    if (!trnAmt) continue // skip invalid entries

    const amount = parseFloat(trnAmt)
    if (isNaN(amount)) continue

    const date = parseOFXDate(dtPosted)

    transactions.push({
      type: trnType || (amount >= 0 ? 'CREDIT' : 'DEBIT'),
      date,
      amount,
      fitId: fitId || checkNum || null,
      memo: memo.trim(),
    })
  }

  return transactions
}

/**
 * Main parser: takes OFX file content string, returns structured object.
 * Works with any Brazilian bank OFX: Nubank, Itaú, Bradesco, Santander, Inter, C6, etc.
 */
export function parseOFX(rawContent) {
  const content = preprocessOFX(rawContent)

  // Bank info
  const org = getTagValue(content, 'ORG')
  const fid = getTagValue(content, 'FID')
  const curDef = getTagValue(content, 'CURDEF')
  const acctId = getTagValue(content, 'ACCTID')
  const bankId = getTagValue(content, 'BANKID')
  const branchId = getTagValue(content, 'BRANCHID')

  // Date range
  const dtStart = parseOFXDate(getTagValue(content, 'DTSTART'))
  const dtEnd = parseOFXDate(getTagValue(content, 'DTEND'))

  // Determine account type
  const isCreditCard = /<CREDITCARDMSGSRSV1>/i.test(content) || /<CCSTMTRS>/i.test(content)
  const acctType = getTagValue(content, 'ACCTTYPE') // CHECKING, SAVINGS, etc.

  // Parse transactions
  const transactions = parseTransactions(content)

  return {
    bank: {
      org: org || 'Desconhecido',
      fid: fid || '',
      bankId: bankId || '',
      branchId: branchId || '',
    },
    account: {
      id: acctId || '',
      type: isCreditCard ? 'credit_card' : (acctType?.toLowerCase() || 'checking'),
    },
    currency: curDef || 'BRL',
    period: {
      start: dtStart,
      end: dtEnd,
    },
    transactions,
  }
}
