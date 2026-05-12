(function () {
  const STORAGE_KEY = "bizTrackLanguage";
  const DEFAULT_LOCALE = "en_US";
  const SUPPORTED_LOCALES = ["en_US", "zh_CN", "zh_HK"];
  const localePathPrefixes = {
    en_US: "",
    zh_CN: "zh-cn",
    zh_HK: "zh-hk",
  };
  const prefixLocales = Object.fromEntries(
    Object.entries(localePathPrefixes)
      .filter(([, prefix]) => prefix)
      .map(([locale, prefix]) => [prefix, locale])
  );
  const legacyLocaleMap = {
    en: "en_US",
    zh: "zh_CN",
  };

  let currentLocale = getLocaleFromPath();
  let currentMessages = {};
  let fallbackMessages = {};
  let initPromise = null;

  function normalizeLocale(locale) {
    return legacyLocaleMap[locale] || (SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE);
  }

  function localeToLang(locale) {
    return locale.replace("_", "-");
  }

  function getLocaleFromPath(pathname = window.location.pathname) {
    const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
    return prefixLocales[firstSegment] || DEFAULT_LOCALE;
  }

  function stripLocaleFromPath(pathname = window.location.pathname) {
    const segments = pathname.split("/").filter(Boolean);
    if (prefixLocales[segments[0]?.toLowerCase()]) {
      segments.shift();
    }

    return segments.length ? `/${segments.join("/")}` : "/";
  }

  function buildLocalizedPath(locale, pathname = window.location.pathname) {
    const nextLocale = normalizeLocale(locale);
    const cleanPath = stripLocaleFromPath(pathname);
    const prefix = localePathPrefixes[nextLocale];

    if (!prefix) return cleanPath;
    return cleanPath === "/" ? `/${prefix}` : `/${prefix}${cleanPath}`;
  }

  function updateBrowserPath(locale) {
    const nextPath = buildLocalizedPath(locale);
    const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState({ locale }, "", nextUrl);
    }
  }

  function navigateToLocale(locale) {
    const nextPath = buildLocalizedPath(locale);
    const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return false;

    localStorage.setItem(STORAGE_KEY, normalizeLocale(locale));
    window.location.assign(nextUrl);
    return true;
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
    const response = await fetch(`/locales/${locale}.json`);
    if (!response.ok) {
      throw new Error(`Unable to load locale ${locale}`);
    }
    return response.json();
  }

  async function init() {
    if (!initPromise) {
      initPromise = (async () => {
        currentLocale = getLocaleFromPath();
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

  async function applyLocale(locale, options = {}) {
    const { updatePath = false } = options;
    const nextLocale = normalizeLocale(locale);
    currentLocale = nextLocale;
    currentMessages = nextLocale === DEFAULT_LOCALE ? fallbackMessages : await loadMessages(nextLocale);
    localStorage.setItem(STORAGE_KEY, nextLocale);
    if (updatePath) updateBrowserPath(nextLocale);
    document.documentElement.lang = localeToLang(nextLocale);
    applyTranslations();
    window.dispatchEvent(new CustomEvent("biztrack:languagechange", { detail: { locale: nextLocale } }));
  }

  async function setLocale(locale) {
    const nextLocale = normalizeLocale(locale);
    if (navigateToLocale(nextLocale)) return;
    return applyLocale(nextLocale, { updatePath: false });
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
    localizeLinks(root);
  }

  function shouldLocalizeHref(href) {
    if (!href || href.startsWith("#")) return false;
    if (/^(https?:|mailto:|tel:)/i.test(href)) return false;
    return href.endsWith(".html") || href === "/" || href === "./" || href === ".";
  }

  function normalizeInternalHref(href) {
    if (href === "." || href === "./") return "/";
    const url = new URL(href, window.location.origin);
    return stripLocaleFromPath(url.pathname);
  }

  function localizeLinks(root = document) {
    root.querySelectorAll("a[href]").forEach((link) => {
      if (!link.dataset.i18nHref) {
        const href = link.getAttribute("href");
        if (!shouldLocalizeHref(href)) return;
        link.dataset.i18nHref = normalizeInternalHref(href);
      }

      link.setAttribute("href", buildLocalizedPath(currentLocale, link.dataset.i18nHref));
    });
  }

  window.addEventListener("popstate", () => {
    const locale = getLocaleFromPath();
    if (locale !== currentLocale) {
      applyLocale(locale, { updatePath: false });
    }
  });

  window.BizTrackI18n = {
    init,
    ready,
    t,
    setLocale,
    getLocale,
    getLocaleFromPath,
    stripLocaleFromPath,
    buildLocalizedPath,
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
