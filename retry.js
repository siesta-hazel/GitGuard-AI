/**
 * Executes a function with exponential backoff if it fails with an HTTP 429 status code.
 *
 * @param {Function} fn The async function to retry
 * @param {Object} options Configuration options
 * @param {number} options.maxRetries Maximum number of retries
 * @param {number} options.baseDelay Initial delay in milliseconds
 * @param {number} options.factor Exponential backoff multiplier factor
 * @param {number} options.maxDelay Maximum delay in milliseconds between retries
 * @returns {Promise<any>}
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 5,
    baseDelay = 2000,
    factor = 2,
    maxDelay = 60000
  } = options;

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const status = error.status || error.statusCode || error.response?.status;
      
      if (status === 429 && attempt <= maxRetries) {
        let delayMs = baseDelay * Math.pow(factor, attempt - 1);
        
        // Inspect headers for retry-after
        const headers = error.headers || error.response?.headers;
        if (headers) {
          let retryAfterHeader = null;
          if (typeof headers.get === 'function') {
            retryAfterHeader = headers.get('retry-after');
          } else {
            retryAfterHeader = headers['retry-after'] || headers['Retry-After'];
          }
          
          if (retryAfterHeader) {
            const seconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(seconds)) {
              delayMs = seconds * 1000;
            } else {
              const parsedDate = Date.parse(retryAfterHeader);
              if (!isNaN(parsedDate)) {
                delayMs = Math.max(0, parsedDate - Date.now());
              }
            }
          }
        }
        
        delayMs = Math.min(delayMs, maxDelay);
        console.warn(`[HTTP 429] Rate limit hit. Retrying in ${delayMs}ms (Attempt ${attempt}/${maxRetries}). Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      throw error;
    }
  }
}

module.exports = { withRetry };
