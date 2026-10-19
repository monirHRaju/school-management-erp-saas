import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.amaarschool.saas",
  appName: "AmaarSchool",
  webDir: "out",
  server: {
    url: "https://amaar-school-app.vercel.app/login",
    cleartext: true,
    errorPath: "offline.html",
  },
};

export default config;
