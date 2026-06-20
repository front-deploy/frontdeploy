const tests = [
  "MC $1.5M",
  "Market Cap: $500K",
  "MKT CAP $1B",
  "Mcap 500,000",
  "Market Cap $1,234,567.89",
  "MCAP: 1.2M"
];

const regex = /\b(?:MC|Market\s*Cap|Mcap|MKT\s*CAP|MCAP)[:\s]*\$?\s*([0-9,]+(?:\.[0-9]+)?)\s*([KMB])?/i;

for (const t of tests) {
  const match = t.match(regex);
  if (match) {
    let val = Number(match[1].replace(/,/g, ''));
    let mult = match[2] ? match[2].toUpperCase() : '';
    console.log(`${t} -> match: ${val} ${mult}`);
  } else {
    console.log(`${t} -> no match`);
  }
}
