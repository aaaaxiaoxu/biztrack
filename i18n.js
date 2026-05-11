(function () {
  const STORAGE_KEY = "bizTrackLanguage";
  const DEFAULT_LOCALE = "en_US";
  const SUPPORTED_LOCALES = ["en_US", "zh_CN", "zh_HK"];
  const legacyLocaleMap = {
    en: "en_US",
    zh: "zh_CN",
  };

  let currentLocale = normalizeLocale(localStorage.getItem(STORAGE_KEY));
  let currentMessages = {};
  let fallbackMessages = {};
  let initPromise = null;

  function normalizeLocale(locale) {
    return legacyLocaleMap[locale] || (SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE);
  }

  function localeToLang(locale) {
    return locale.replace("_", "-");
  }

  function getPagePrefix() {
    const page = document.body?.dataset.i18nPage;
    if (page) return `${page}.`;

    const filename = window.location.pathname.split("/").pop() || "index.html";
    const prefixByFile = {
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

  async function loadMessages(locale) {
    const response = await fetch(`./locales/${locale}.json`);
    if (!response.ok) {
      throw new Error(`Unable to load locale ${locale}`);
    }
    return response.json();
  }

  async function init() {
    if (!initPromise) {
      initPromise = (async () => {
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

  function ready() {
    return initPromise || Promise.resolve();
  }

  function lookup(messages, key) {
    if (!messages || !key) return undefined;
    if (Object.prototype.hasOwnProperty.call(messages, key)) return messages[key];

    const parts = key.split(".");
    for (let splitIndex = parts.length - 1; splitIndex >= 1; splitIndex--) {
      const container = parts.slice(0, splitIndex).reduce((value, part) => {
        return value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined;
      }, messages);
      const messageKey = parts.slice(splitIndex).join(".");
      if (container && Object.prototype.hasOwnProperty.call(container, messageKey)) {
        return container[messageKey];
      }
    }

    return undefined;
  }

  function interpolate(value, params) {
    if (!params || typeof value !== "string") return value;
    return value.replace(/\{(\w+)\}/g, (_match, name) => {
      return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : `{${name}}`;
    });
  }

  function resolveKey(key, prefix) {
    const directMatch = lookup(currentMessages, key) ?? lookup(fallbackMessages, key);
    const candidates = directMatch !== undefined ? [key] : [`${prefix}${key}`, `common.${key}`];

    for (const candidate of candidates) {
      const translated = lookup(currentMessages, candidate) ?? lookup(fallbackMessages, candidate);
      if (translated !== undefined) return translated;
    }

    return key;
  }

  function t(key, params) {
    return interpolate(resolveKey(String(key), getPagePrefix()), params);
  }

  function useI18nWrapper(prefix) {
    return {
      get locale() {
        return currentLocale;
      },
      t(key, params) {
        return interpolate(resolveKey(String(key), prefix), params);
      },
      setLocale,
      getLocale,
    };
  }

  async function setLocale(locale) {
    const nextLocale = normalizeLocale(locale);
    currentLocale = nextLocale;
    currentMessages = nextLocale === DEFAULT_LOCALE ? fallbackMessages : await loadMessages(nextLocale);
    localStorage.setItem(STORAGE_KEY, nextLocale);
    document.documentElement.lang = localeToLang(nextLocale);
    applyTranslations();
    window.dispatchEvent(new CustomEvent("biztrack:languagechange", { detail: { locale: nextLocale } }));
  }

  function getLocale() {
    return currentLocale;
  }

  function renderTemplate(value) {
    if (typeof value !== "string") return value;
    return value.replace(/\{\{\s*t\(\s*(["'])(.*?)\1\s*\)\s*\}\}/g, (_match, _quote, key) => t(key));
  }

  function applyTextTemplates(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest("script,style,noscript,svg,canvas,[data-i18n-skip]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.__bizTrackI18nTemplate !== undefined
          || node.textContent.includes("{{ t(")
          || node.textContent.includes("{{t(")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      if (node.__bizTrackI18nTemplate === undefined) {
        node.__bizTrackI18nTemplate = node.textContent;
      }
      node.textContent = renderTemplate(node.__bizTrackI18nTemplate);
    });
  }

  function applyAttributeTemplates(root) {
    root.querySelectorAll("*").forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        const templateKey = `bizTrackI18n${attribute.name}`;
        const hasTemplate = element[templateKey] !== undefined
          || attribute.value.includes("{{ t(")
          || attribute.value.includes("{{t(");
        if (!hasTemplate) return;
        if (element[templateKey] === undefined) {
          element[templateKey] = attribute.value;
        }
        element.setAttribute(attribute.name, renderTemplate(element[templateKey]));
      });
    });
  }

  function applyDataBindings(root) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });

    const attributeMap = {
      "data-i18n-placeholder": "placeholder",
      "data-i18n-title": "title",
      "data-i18n-aria-label": "aria-label",
      "data-i18n-value": "value",
    };

    for (const [dataAttribute, targetAttribute] of Object.entries(attributeMap)) {
      root.querySelectorAll(`[${dataAttribute}]`).forEach((element) => {
        element.setAttribute(targetAttribute, t(element.getAttribute(dataAttribute)));
      });
    }
  }

  function applyTranslations(root = document) {
    if (!root) return;
    applyDataBindings(root);
    applyTextTemplates(root);
    applyAttributeTemplates(root);
  }

  window.BizTrackI18n = {
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
})();
