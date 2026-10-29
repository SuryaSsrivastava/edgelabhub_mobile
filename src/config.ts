import Constants from "expo-constants"

/**
 * Where the EdgeLabHub API lives. Set EXPO_PUBLIC_API_URL when building (see eas.json); the sign-in screen can also override it at run time
 * (handy for testing against a staging server). It ends in /api/v1.
 */
export const DEFAULT_API_URL: string =
  process.env.EXPO_PUBLIC_API_URL || (Constants.expoConfig?.extra?.apiUrl as string | undefined) || "https://edgelabhub.com/api/v1"

export const WEBSITE_URL = DEFAULT_API_URL.replace(/\/api\/v1\/?$/, "")
