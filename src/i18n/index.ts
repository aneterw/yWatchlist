import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zhTW from "./zh-TW.json";
import zhCN from "./zh-CN.json";
import en from "./en.json";
import ja from "./ja.json";
import ko from "./ko.json";
import es from "./es.json";

const resources = {
  "zh-TW": { translation: zhTW },
  "zh-CN": { translation: zhCN },
  en: { translation: en },
  ja: { translation: ja },
  ko: { translation: ko },
  es: { translation: es },
};

// Detect browser language
function getBrowserLanguage(): string {
  const browserLang = navigator.language || navigator.languages?.[0] || "en";
  const langCode = browserLang.toLowerCase();

  // Try exact match first
  const supportedLanguages = ["zh-TW", "zh-CN", "en", "ja", "ko", "es"];
  if (supportedLanguages.includes(browserLang)) {
    return browserLang;
  }

  // Try prefix match
  if (langCode.startsWith("zh")) {
    return langCode.includes("tw") || langCode.includes("hk") ? "zh-TW" : "zh-CN";
  }
  if (langCode.startsWith("ja")) return "ja";
  if (langCode.startsWith("ko")) return "ko";
  if (langCode.startsWith("es")) return "es";

  return "en";
}

i18n.use(initReactI18next).init({
  resources,
  lng: getBrowserLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;