Wate is a control-flow library for JavaScript based on callbacks. Rather than
using heavyweight Promise-based libraries that swallow errors, leak memory, and
lose stack traces in production, use Wate to wait for simple async control
flow.

Wate interops with most Promise-based libraries, if you use them, by exposing a
Promises/A compatible wrapper. It integrates with typical error-first Node
functions by virtue of being built explicitly for them.
