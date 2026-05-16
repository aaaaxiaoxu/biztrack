import "./i18n";
import type { I18nParams } from "./types";

const CONSENT_KEY = "bizTrackCookieConsent";

type LanguageControl = HTMLDivElement & { updateLanguageButton?: () => void };

function commonT(key: string, params?: I18nParams): string {
  return window.BizTrackI18n?.useCommonI18n().t(key, params) || key;
}

function toggleSidebar(): void {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  sidebar.style.display = sidebar.style.display === "block" ? "none" : "block";
}

function closeSidebar(): void {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.style.display = "none";
}

function bindSidebarControls(): void {
  document.querySelectorAll<HTMLElement>("[data-sidebar-toggle]").forEach((element) => {
    element.addEventListener("click", toggleSidebar);
  });

  document.querySelectorAll<HTMLElement>("[data-sidebar-close]").forEach((element) => {
    element.addEventListener("click", closeSidebar);
  });
}

function enhanceKeyboardAccess(): void {
  document.querySelectorAll<HTMLElement>("[data-sidebar-toggle], [data-sidebar-close]").forEach((element) => {
    if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "0");
    if (!element.hasAttribute("role")) element.setAttribute("role", "button");
    if (!element.hasAttribute("aria-label")) {
      const defaultLabel = element.matches("[data-sidebar-toggle]") ? "Open navigation" : "Control";
      element.setAttribute("aria-label", element.textContent?.trim() || element.getAttribute("title") || defaultLabel);
    }
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        element.click();
      }
    });
  });
}

function injectLanguageToggle(): void {
  const userInfo = document.querySelector(".user-info");
  if (!userInfo || document.getElementById("language-menu-button")) return;

  const control = document.createElement("div") as LanguageControl;
  control.className = "language-control";

  const icon = document.createElement("i");
  icon.className = "fa-solid fa-language";
  icon.setAttribute("aria-hidden", "true");

  const button = document.createElement("button");
  button.id = "language-menu-button";
  button.type = "button";
  button.className = "language-button";
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", "{{ t('common.Language') }}");

  const label = document.createElement("span");
  label.className = "language-current";

  const chevron = document.createElement("i");
  chevron.className = "fa-solid fa-chevron-down language-chevron";
  chevron.setAttribute("aria-hidden", "true");

  const menu = document.createElement("div");
  menu.id = "language-menu";
  menu.className = "language-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-labelledby", "language-menu-button");
  menu.hidden = true;

  [
    { value: "en_US", label: "English", shortLabel: "EN" },
    { value: "zh_CN", label: "简体中文", shortLabel: "简" },
    { value: "zh_HK", label: "繁體中文", shortLabel: "繁" },
  ].forEach((locale) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "language-menu-item";
    item.dataset.locale = locale.value;
    item.dataset.shortLabel = locale.shortLabel;
    item.setAttribute("role", "menuitemradio");
    item.setAttribute("aria-checked", "false");
    item.textContent = locale.label;
    item.addEventListener("click", async () => {
      try {
        await window.BizTrackI18n?.setLocale(locale.value);
        setMenuOpen(false);
      } catch (error) {
        console.error("Unable to switch language", error);
      }
    });
    menu.appendChild(item);
  });

  function setMenuOpen(open: boolean): void {
    control.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    menu.hidden = !open;
  }

  function updateLanguageButton(): void {
    const locale = window.BizTrackI18n?.getLocale() || "en_US";
    const activeItem = menu.querySelector<HTMLElement>(`[data-locale="${locale}"]`);
    label.textContent = activeItem?.dataset.shortLabel || "EN";
    menu.querySelectorAll<HTMLElement>(".language-menu-item").forEach((item) => {
      const isActive = item.dataset.locale === locale;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-checked", String(isActive));
    });
  }

  button.addEventListener("click", () => setMenuOpen(menu.hidden === true));
  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !control.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });

  button.append(icon, label, chevron);
  control.append(button, menu);
  userInfo.appendChild(control);

  updateLanguageButton();
  control.updateLanguageButton = updateLanguageButton;
}

function createCookieBanner(): HTMLElement {
  const banner = document.createElement("section");
  banner.id = "cookie-banner";
  banner.className = "cookie-banner";
  banner.setAttribute("aria-label", "{{ t('common.Cookie notice') }}");

  const content = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = "{{ t(\"common.Your privacy matters\") }}";

  const message = document.createElement("p");
  message.textContent = "{{ t(\"common.BizTrack stores business records and language/cookie preferences in this browser only. We do not sell or share your data.\") }}";

  const privacyLink = document.createElement("a");
  privacyLink.href = "/privacy.html";
  privacyLink.textContent = "{{ t(\"common.Privacy Policy\") }}";

  const actions = document.createElement("div");
  actions.className = "cookie-actions";

  const declineButton = document.createElement("button");
  declineButton.type = "button";
  declineButton.className = "btn secondary";
  declineButton.textContent = "{{ t(\"common.Decline\") }}";

  const acceptButton = document.createElement("button");
  acceptButton.type = "button";
  acceptButton.className = "btn";
  acceptButton.textContent = "{{ t(\"common.Accept\") }}";

  declineButton.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    banner.remove();
  });
  acceptButton.addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    banner.remove();
  });

  content.append(title, message, privacyLink);
  actions.append(declineButton, acceptButton);
  banner.append(content, actions);
  return banner;
}

function injectCookieBanner(): void {
  if (localStorage.getItem(CONSENT_KEY) || document.getElementById("cookie-banner")) return;
  document.body.appendChild(createCookieBanner());
}

window.addEventListener("DOMContentLoaded", async () => {
  bindSidebarControls();
  injectLanguageToggle();
  injectCookieBanner();
  enhanceKeyboardAccess();

  try {
    await window.BizTrackI18n?.init();
  } catch (error) {
    console.error("Unable to initialize i18n", error);
  }
});

window.addEventListener("biztrack:languagechange", () => {
  const languageControl = document.querySelector<LanguageControl>(".language-control");
  languageControl?.updateLanguageButton?.();

  document.querySelectorAll<HTMLButtonElement>("#submitBtn").forEach((button) => {
    const mode = button.dataset.mode === "update" ? "Update" : "Add";
    button.textContent = commonT(mode);
  });
});

export {};
