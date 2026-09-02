/**
 * Async handler middleware to wrap express route handlers
 * and pass any thrown errors or rejected promises to next()
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
