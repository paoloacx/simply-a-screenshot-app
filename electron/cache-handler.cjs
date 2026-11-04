// The packaged app lives inside a signed bundle. Next's default file-system
// cache writes route-cache files under .next/server on the first page load,
// which adds unsealed files to the bundle and invalidates the code signature.
// This editor has no ISR or revalidation to persist, so a no-op cache keeps the
// bundle byte-for-byte identical while the app runs.
module.exports = class NoopCacheHandler {
  // eslint-disable-next-line no-unused-vars
  constructor(_options) {}

  async get() {
    return null;
  }

  // eslint-disable-next-line no-unused-vars
  async set(_key, _data, _context) {}

  // eslint-disable-next-line no-unused-vars
  async revalidateTag(_tags) {}

  resetRequestCache() {}
};
