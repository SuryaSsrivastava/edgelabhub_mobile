// The "live trades" notification runs in an Android foreground service (Notifee's). Notifee declares it as a `shortService`, which Android 14 cuts off after a few minutes;
// a trade can run for hours, so it is declared here as `dataSync` (what it does: it keeps fetching your open trades), with the permissions Android 14 asks for.
const { withAndroidManifest } = require("expo/config-plugins")

module.exports = function withLiveService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools"
    const perms = manifest["uses-permission"] ?? (manifest["uses-permission"] = [])
    for (const name of ["android.permission.FOREGROUND_SERVICE", "android.permission.FOREGROUND_SERVICE_DATA_SYNC"]) {
      if (!perms.some((p) => p.$["android:name"] === name)) perms.push({ $: { "android:name": name } })
    }
    const app = manifest.application[0]
    const services = app.service ?? (app.service = [])
    const name = "app.notifee.core.ForegroundService"
    const mine = { $: { "android:name": name, "android:exported": "false", "android:foregroundServiceType": "dataSync", "tools:replace": "android:foregroundServiceType" } }
    const at = services.findIndex((s) => s.$["android:name"] === name)
    if (at >= 0) services[at] = mine
    else services.push(mine)
    return cfg
  })
}
