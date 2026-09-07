function pack(rows) {
  return (rows || []).map((row, i) => ({
    no: String(i + 1).padStart(2, '0'),
    tag: row[0],
    title: row[1],
    body: row[2]
  }))
}

module.exports = { pack }
