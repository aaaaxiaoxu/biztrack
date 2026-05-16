import "./app-core";
import "./common";

function getElement<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function openSidebar(): void {
  const side = getElement<HTMLElement>("sidebar");
  side.style.display = side.style.display === "block" ? "none" : "block";
}

function closeSidebar(): void {
  getElement<HTMLElement>("sidebar").style.display = "none";
}

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
