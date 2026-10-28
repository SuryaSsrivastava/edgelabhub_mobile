// The Expo configuration. Dynamic (instead of app.json) so the Android Firebase file is used only when you have added it.
const fs = require("fs")

const hasFirebase = fs.existsSync("./google-services.json")

module.exports = {
  expo: {
    name: "EdgeLabHub",
    slug: "edgelabhub",
    scheme: "edgelabhub",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    icon: "./assets/icon.png",
    backgroundColor: "#0b0e14",
    splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#0b0e14" },
    ios: {
      bundleIdentifier: "app.edgelabhub.mobile",
      supportsTablet: false,
      infoPlist: { UIBackgroundModes: ["remote-notification"], ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      package: "app.edgelabhub.mobile",
      adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#0b0e14" },
      permissions: ["POST_NOTIFICATIONS"],
      ...(hasFirebase ? { googleServicesFile: "./google-services.json" } : {}),
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#22d38a" }],
    ],
    experiments: { typedRoutes: false },
    extra: {
      // `eas init` writes the project id here; it is needed for push tokens
      eas: { projectId: process.env.EAS_PROJECT_ID || "" },
    },
  },
}
