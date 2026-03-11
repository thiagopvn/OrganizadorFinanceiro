/**
 * OFX Parser — parses OFXSGML (v1) format used by Nubank and Brazilian banks.
 * Returns structured data: bank info, account, date range, and transaction list.
 */

/**
 * Parse OFX date string like "20251231000000[-3:BRT]" → JS Date
 */
function parseOFXDate(raw) {
  if (!raw) return null
  // Strip timezone info in brackets
  const clean = raw.replace(/\[.*\]/, '').trim()
  // Format: YYYYMMDDHHmmss or YYYYMMDD
  const y = parseInt(clean.substring(0, 4))
  const m = parseInt(clean.substring(4, 6)) - 1
  const d = parseInt(clean.substring(6, 8))
  const h = clean.length >= 10 ? parseInt(clean.substring(8, 10)) : 0
  const min = clean.length >= 12 ? parseInt(clean.substring(10, 12)) : 0
  const s = clean.length >= 14 ? parseInt(clean.substring(12, 14)) : 0
  return new Date(y, m, d, h, min, s)
}

/**
 * Extract tag value from OFXSGML content: <TAG>value</TAG> or <TAG>value\n
 */
function getTagValue(content, tag) {
  // Try closed tag first: <TAG>value</TAG>
  const closedRe = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i')
  const closedMatch = content.match(closedRe)
  if (closedMatch) return closedMatch[1].trim()

  // Try open tag (SGML style): <TAG>value followed by newline or <
  const openRe = new RegExp(`<${tag}>([^<\\n]+)`, 'i')
  const openMatch = content.match(openRe)
  if (openMatch) return openMatch[1].trim()

  return null
}

/**
 * Parse all <STMTTRN> blocks from OFX content
 */
function parseTransactions(content) {
  const transactions = []
  const blocks = content.split(/<STMTTRN>/i).slice(1) // skip before first

  for (const block of blocks) {
    const endIdx = block.indexOf('</STMTTRN>')
    const chunk = endIdx >= 0 ? block.substring(0, endIdx) : block

    const trnType = getTagValue(chunk, 'TRNTYPE')
    const dtPosted = getTagValue(chunk, 'DTPOSTED')
    const trnAmt = getTagValue(chunk, 'TRNAMT')
    const fitId = getTagValue(chunk, 'FITID')
    const memo = getTagValue(chunk, 'MEMO')

    if (!trnAmt) continue // skip invalid entries

    const amount = parseFloat(trnAmt)
    const date = parseOFXDate(dtPosted)

    transactions.push({
      type: trnType || (amount >= 0 ? 'CREDIT' : 'DEBIT'),
      date,
      amount,
      fitId: fitId || null,
      memo: memo || '',
    })
  }

  return transactions
}

/**
 * Main parser: takes OFX file content string, returns structured object
 */
export function parseOFX(content) {
  // Bank info
  const org = getTagValue(content, 'ORG')
  const fid = getTagValue(content, 'FID')
  const curDef = getTagValue(content, 'CURDEF')
  const acctId = getTagValue(content, 'ACCTID')

  // Date range
  const dtStart = parseOFXDate(getTagValue(content, 'DTSTART'))
  const dtEnd = parseOFXDate(getTagValue(content, 'DTEND'))

  // Determine account type
  const isCreditCard = /<CREDITCARDMSGSRSV1>/i.test(content) || /<CCSTMTRS>/i.test(content)

  // Parse transactions
  const transactions = parseTransactions(content)

  return {
    bank: {
      org: org || 'Desconhecido',
      fid: fid || '',
    },
    account: {
      id: acctId || '',
      type: isCreditCard ? 'credit_card' : 'checking',
    },
    currency: curDef || 'BRL',
    period: {
      start: dtStart,
      end: dtEnd,
    },
    transactions,
  }
}
