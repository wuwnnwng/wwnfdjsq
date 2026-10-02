let handler = null

function wait(fn) {
  handler = fn
}

function deliver(path) {
  const fn = handler
  handler = null
  if (fn) fn(path)
}

function cancel() {
  handler = null
}

module.exports = {
  wait,
  deliver,
  cancel
}
