/**
 * Standard API response formatters for Paleo Marketplace
 */

function successResponse(res, data = {}, statusCode = 200, message = null) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    Object.assign(payload, data);
  } else if (data !== undefined) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}

function errorResponse(res, message = 'Internal Server Error', statusCode = 500, details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}

module.exports = {
  successResponse,
  errorResponse
};
