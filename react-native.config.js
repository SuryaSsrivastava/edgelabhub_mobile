// Notifee (the live-trades notification) has native Android code that runs when the app starts. It is left out of normal builds and linked only when a build sets LIVE_NOTIFICATION=1
// (EAS profile "live"), so a problem with it can never stop the app from opening.
module.exports = {
  dependencies: {
    "@notifee/react-native": { platforms: { android: process.env.LIVE_NOTIFICATION === "1" ? undefined : null } },
  },
}
