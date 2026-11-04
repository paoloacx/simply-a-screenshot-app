const base = require("./electron-builder.base.json");

// Signing is automatic when a Developer ID Application certificate is in the
// keychain. Notarization needs one extra credential set; without it the build
// still signs (or stays unsigned) and remains usable locally.
const hasAppleId = Boolean(
  process.env.APPLE_ID &&
    process.env.APPLE_APP_SPECIFIC_PASSWORD &&
    process.env.APPLE_TEAM_ID,
);
const hasApiKey = Boolean(
  process.env.APPLE_API_KEY &&
    process.env.APPLE_API_KEY_ID &&
    process.env.APPLE_API_ISSUER,
);

/** @type {import("electron-builder").Configuration} */
module.exports = {
  ...base,
  mac: {
    ...base.mac,
    // Required to notarize. The entitlements cover Electron's JIT and the
    // prebuilt native module used by sharp.
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    // electron-builder signs with the Developer ID in the keychain and then
    // submits the app to Apple when credentials are present.
    notarize: hasAppleId || hasApiKey,
  },
};
