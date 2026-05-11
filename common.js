(function () {
  const STORAGE_KEY = "bizTrackLanguage";
  const CONSENT_KEY = "bizTrackCookieConsent";
  const defaultLanguage = "en";

  const translations = {
    zh: {
      Dashboard: "仪表盘",
      Products: "产品",
      Orders: "订单",
      Expenses: "支出",
      Help: "帮助",
      "Meet the Developer": "开发者介绍",
      Summary: "概览",
      Analytics: "分析",
      Revenue: "收入",
      Balance: "余额",
      "Sales by Product Category": "按产品类别统计销售额",
      "Add Product": "添加产品",
      "Download CSV": "下载 CSV",
      "Add Order": "添加订单",
      "Export to CSV": "导出 CSV",
      "Add Expense": "添加支出",
      Search: "搜索",
      Add: "添加",
      Update: "更新",
      Cancel: "取消",
      "Privacy Policy": "隐私政策",
      "Cookie Settings": "Cookie 设置",
      Accept: "同意",
      Decline: "拒绝",
      "Your privacy matters": "我们重视你的隐私",
      "BizTrack stores business records and language/cookie preferences in this browser only. We do not sell or share your data.": "BizTrack 只在本浏览器保存业务记录、语言和 Cookie 偏好。我们不会出售或共享你的数据。",
      "Using BizTrack: A Quick Guide": "BizTrack 快速指南",
      "What is BizTrack?": "什么是 BizTrack？",
      "Navigating the Dashboard": "浏览仪表盘",
      "Expenses Page": "支出页面",
      "Orders Page": "订单页面",
      "Adding a New Expense, Order or Product": "添加新的支出、订单或产品",
      "Sorting and Searching Entries/Tables": "排序和搜索记录",
      "My Coding Journey": "我的编程旅程",
    },
  };

  function getLanguage() {
    return localStorage.getItem(STORAGE_KEY) || defaultLanguage;
  }

  function setLanguage(language) {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    applyTranslations();
  }

  function translate(text) {
    const language = getLanguage();
    return translations[language]?.[text] || text;
  }

  function applyTranslations() {
    const language = getLanguage();
    document.documentElement.lang = language;

    document.querySelectorAll("[data-i18n-original]").forEach((element) => {
      const original = element.dataset.i18nOriginal;
      element.textContent = translations[language]?.[original] || original;
    });

    document.querySelectorAll("[placeholder]").forEach((element) => {
      if (!element.dataset.i18nPlaceholder) {
        element.dataset.i18nPlaceholder = element.getAttribute("placeholder");
      }
      const original = element.dataset.i18nPlaceholder;
      element.setAttribute("placeholder", translations[language]?.[original] || original);
    });

    const toggle = document.getElementById("language-toggle");
    if (toggle) toggle.value = language;
  }

  function markStaticText() {
    const selector = "h1,h2,h3,span,button,label,th,a,option,p,li,small";
    document.querySelectorAll(selector).forEach((element) => {
      if (element.children.length > 0 || element.dataset.i18nOriginal) return;
      const text = element.textContent.trim();
      if (text) element.dataset.i18nOriginal = text;
    });
  }

  function enhanceKeyboardAccess() {
    document.querySelectorAll(".menu-icon, .fa-xmark, th[onclick]").forEach((element) => {
      if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "0");
      if (!element.hasAttribute("role")) element.setAttribute("role", "button");
      if (!element.hasAttribute("aria-label")) {
        element.setAttribute("aria-label", element.textContent.trim() || element.getAttribute("title") || "Control");
      }
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          element.click();
        }
      });
    });
  }

  function injectLanguageToggle() {
    const userInfo = document.querySelector(".user-info");
    if (!userInfo || document.getElementById("language-toggle")) return;

    const label = document.createElement("label");
    label.className = "language-control";
    label.setAttribute("for", "language-toggle");

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-language";
    icon.setAttribute("aria-hidden", "true");

    const select = document.createElement("select");
    select.id = "language-toggle";
    select.setAttribute("aria-label", "Language");
    select.innerHTML = `
      <option value="en">EN</option>
      <option value="zh">中文</option>
    `;
    select.value = getLanguage();
    select.addEventListener("change", () => setLanguage(select.value));

    label.append(icon, select);
    userInfo.appendChild(label);
  }

  function injectCookieBanner() {
    if (localStorage.getItem(CONSENT_KEY) || document.getElementById("cookie-banner")) return;

    const banner = document.createElement("section");
    banner.id = "cookie-banner";
    banner.className = "cookie-banner";
    banner.setAttribute("aria-label", "Cookie notice");
    banner.innerHTML = `
      <div>
        <strong data-i18n-original="Your privacy matters">Your privacy matters</strong>
        <p data-i18n-original="BizTrack stores business records and language/cookie preferences in this browser only. We do not sell or share your data.">BizTrack stores business records and language/cookie preferences in this browser only. We do not sell or share your data.</p>
        <a href="./privacy.html" data-i18n-original="Privacy Policy">Privacy Policy</a>
      </div>
      <div class="cookie-actions">
        <button type="button" class="btn secondary" data-i18n-original="Decline">Decline</button>
        <button type="button" class="btn" data-i18n-original="Accept">Accept</button>
      </div>
    `;

    const [declineButton, acceptButton] = banner.querySelectorAll("button");
    declineButton.addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "declined");
      banner.remove();
    });
    acceptButton.addEventListener("click", () => {
      localStorage.setItem(CONSENT_KEY, "accepted");
      banner.remove();
    });

    document.body.appendChild(banner);
  }

  window.BizTrackI18n = { translate, setLanguage, applyTranslations };
  window.addEventListener("DOMContentLoaded", () => {
    markStaticText();
    injectLanguageToggle();
    injectCookieBanner();
    enhanceKeyboardAccess();
    applyTranslations();
  });
})();
