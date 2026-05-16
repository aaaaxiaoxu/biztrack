import type { BizTrackI18n, I18nParams, I18nWrapper } from "./types";

const STORAGE_KEY = "bizTrackLanguage";
const DEFAULT_LOCALE = "en_US";
const SUPPORTED_LOCALES = ["en_US", "zh_CN", "zh_HK"] as const;

type Locale = (typeof SUPPORTED_LOCALES)[number];
type MessageTree = Record<string, unknown>;
type TemplateText = Text & { __bizTrackI18nTemplate?: string | null };
type TemplateElement = Element & Record<string, string | undefined>;

const legacyLocaleMap: Record<string, Locale> = {
  en: "en_US",
  zh: "zh_CN",
};

let currentLocale = normalizeLocale(localStorage.getItem(STORAGE_KEY));
let currentMessages: MessageTree = {};
let fallbackMessages: MessageTree = {};
let initPromise: Promise<void> | null = null;

function isMessageTree(value: unknown): value is MessageTree {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeLocale(locale: string | null | undefined): Locale {
  return legacyLocaleMap[locale ?? ""] || (SUPPORTED_LOCALES.includes(locale as Locale) ? (locale as Locale) : DEFAULT_LOCALE);
}

function localeToLang(locale: string): string {
  return locale.replace("_", "-");
}

function getPagePrefix(): string {
  const page = document.body?.dataset.i18nPage;
  if (page) return `${page}.`;

  const filename = window.location.pathname.split("/").pop() || "index.html";
  const prefixByFile: Record<string, string> = {
    "": "dashboard",
    "index.html": "dashboard",
    "products.html": "products",
    "orders.html": "orders",
    "finances.html": "expenses",
    "help.html": "help",
    "about.html": "about",
    "privacy.html": "privacy",
  };

  return `${prefixByFile[filename] || "common"}.`;
}

async function loadMessages(locale: Locale): Promise<MessageTree> {
  const response = await fetch(`/locales/${locale}.json`);
  if (!response.ok) {
    throw new Error(`Unable to load locale ${locale}`);
  }
  return response.json() as Promise<MessageTree>;
}

async function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      currentLocale = normalizeLocale(localStorage.getItem(STORAGE_KEY));
      fallbackMessages = await loadMessages(DEFAULT_LOCALE);
      currentMessages = currentLocale === DEFAULT_LOCALE ? fallbackMessages : await loadMessages(currentLocale);
      localStorage.setItem(STORAGE_KEY, currentLocale);
      document.documentElement.lang = localeToLang(currentLocale);
      applyTranslations();
      window.dispatchEvent(new CustomEvent("biztrack:languagechange", { detail: { locale: currentLocale } }));
    })();
  }

  return initPromise;
}

function ready(): Promise<void> {
  return initPromise || Promise.resolve();
}

function lookup(messages: MessageTree, key: string): string | undefined {
  if (!messages || !key) return undefined;

  const directValue = messages[key];
  if (typeof directValue === "string") return directValue;

  const parts = key.split(".");
  for (let splitIndex = parts.length - 1; splitIndex >= 1; splitIndex--) {
    const container = parts.slice(0, splitIndex).reduce<unknown>((value, part) => {
      if (!isMessageTree(value)) return undefined;
      return Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined;
    }, messages);
    const messageKey = parts.slice(splitIndex).join(".");
    if (isMessageTree(container) && Object.prototype.hasOwnProperty.call(container, messageKey)) {
      const nestedValue = container[messageKey];
      if (typeof nestedValue === "string") return nestedValue;
    }
  }

  return undefined;
}

function interpolate(value: string, params?: I18nParams): string {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_match, name: string) => {
    return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : `{${name}}`;
  });
}

function resolveKey(key: string, prefix: string): string {
  const directMatch = lookup(currentMessages, key) ?? lookup(fallbackMessages, key);
  const candidates = directMatch !== undefined ? [key] : [`${prefix}${key}`, `common.${key}`];

  for (const candidate of candidates) {
    const translated = lookup(currentMessages, candidate) ?? lookup(fallbackMessages, candidate);
    if (translated !== undefined) return translated;
  }

  return key;
}

function t(key: string, params?: I18nParams): string {
  return interpolate(resolveKey(String(key), getPagePrefix()), params);
}

function useI18nWrapper(prefix: string): I18nWrapper {
  return {
    get locale() {
      return currentLocale;
    },
    t(key: string, params?: I18nParams) {
      return interpolate(resolveKey(String(key), prefix), params);
    },
    setLocale,
    getLocale,
  };
}

async function applyLocale(locale: string): Promise<void> {
  const nextLocale = normalizeLocale(locale);
  currentLocale = nextLocale;
  currentMessages = nextLocale === DEFAULT_LOCALE ? fallbackMessages : await loadMessages(nextLocale);
  localStorage.setItem(STORAGE_KEY, nextLocale);
  document.documentElement.lang = localeToLang(nextLocale);
  applyTranslations();
  window.dispatchEvent(new CustomEvent("biztrack:languagechange", { detail: { locale: nextLocale } }));
}

async function setLocale(locale: string): Promise<void> {
  return applyLocale(locale);
}

function getLocale(): string {
  return currentLocale;
}

function renderTemplate(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{\s*t\(\s*(["'])(.*?)\1\s*\)\s*\}\}/g, (_match, _quote, key: string) => t(key));
}

function applyTextTemplates(root: Document | HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const textNode = node as TemplateText;
      const parent = textNode.parentElement;
      if (!parent || parent.closest("script,style,noscript,svg,canvas,[data-i18n-skip]")) {
        return NodeFilter.FILTER_REJECT;
      }
      return textNode.__bizTrackI18nTemplate !== undefined
        || (textNode.textContent ?? "").includes("{{ t(")
        || (textNode.textContent ?? "").includes("{{t(")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: TemplateText[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as TemplateText);

  nodes.forEach((node) => {
    if (node.__bizTrackI18nTemplate === undefined) {
      node.__bizTrackI18nTemplate = node.textContent;
    }
    node.textContent = String(renderTemplate(node.__bizTrackI18nTemplate));
  });
}

function applyAttributeTemplates(root: Document | HTMLElement): void {
  root.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const templateKey = `bizTrackI18n${attribute.name}`;
      const templateElement = element as TemplateElement;
      const hasTemplate = templateElement[templateKey] !== undefined
        || attribute.value.includes("{{ t(")
        || attribute.value.includes("{{t(");
      if (!hasTemplate) return;
      if (templateElement[templateKey] === undefined) {
        templateElement[templateKey] = attribute.value;
      }
      element.setAttribute(attribute.name, String(renderTemplate(templateElement[templateKey])));
    });
  });
}

function applyDataBindings(root: Document | HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n ?? "");
  });

  const attributeMap = {
    "data-i18n-placeholder": "placeholder",
    "data-i18n-title": "title",
    "data-i18n-aria-label": "aria-label",
    "data-i18n-value": "value",
  };

  for (const [dataAttribute, targetAttribute] of Object.entries(attributeMap)) {
    root.querySelectorAll<HTMLElement>(`[${dataAttribute}]`).forEach((element) => {
      element.setAttribute(targetAttribute, t(element.getAttribute(dataAttribute) ?? ""));
    });
  }
}

function applyTranslations(root: Document | HTMLElement = document): void {
  if (!root) return;
  applyDataBindings(root);
  applyTextTemplates(root);
  applyAttributeTemplates(root);
}

const i18n: BizTrackI18n = {
  init,
  ready,
  t,
  setLocale,
  getLocale,
  applyTranslations,
  useI18nWrapper,
  useCommonI18n: () => useI18nWrapper("common."),
  useDashboardI18n: () => useI18nWrapper("dashboard."),
  useProductsI18n: () => useI18nWrapper("products."),
  useOrdersI18n: () => useI18nWrapper("orders."),
  useExpensesI18n: () => useI18nWrapper("expenses."),
  useHelpI18n: () => useI18nWrapper("help."),
  useAboutI18n: () => useI18nWrapper("about."),
  usePrivacyI18n: () => useI18nWrapper("privacy."),
  useErrorPageI18n: () => useI18nWrapper("errorPage."),
  useRuleI18n: () => useI18nWrapper("rule."),
  useProgressI18n: () => useI18nWrapper("progress."),
  useParameterI18n: () => useI18nWrapper("parameter."),
  useFeaturePermissionI18n: () => useI18nWrapper("featurePermission."),
  useWebUII18n: () => useI18nWrapper("appWebUI."),
  useFaceswapperI18n: () => useI18nWrapper("appFaceswapper."),
  useVideoI18n: () => useI18nWrapper("appVideo."),
  useUserProfileI18n: () => useI18nWrapper("appUserProfile."),
  useGalleryI18n: (prefix) => useI18nWrapper(`appGallery.${prefix}.`),
  useGalleryCommonI18n: () => useI18nWrapper("appGallery.common."),
  useGalleryModelsI18n: () => useI18nWrapper("appGallery.models."),
  useGalleryImagesI18n: () => useI18nWrapper("appGallery.images."),
  useCommentSectionI18n: () => useI18nWrapper("commentSection."),
  useToolkitsI18n: () => useI18nWrapper("appToolkits."),
  useNotificationI18n: () => useI18nWrapper("appNotification."),
  useFollowI18n: () => useI18nWrapper("appFollow."),
};

window.BizTrackI18n = i18n;

export {
  applyTranslations,
  getLocale,
  init,
  ready,
  setLocale,
  t,
  useI18nWrapper,
};

export default i18n;
