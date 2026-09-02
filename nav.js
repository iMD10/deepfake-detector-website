/* The header only: burger, overlay, mobile sheet.

   Shared by the standalone document pages. main.js cannot serve them — it
   expects the upload machinery, the stage clock and the result panel, none of
   which exist outside the landing — and five copies of eleven lines is worse
   than one file. */
(function () {
  "use strict";

  var burger = document.getElementById("burger");
  var overlay = document.getElementById("overlay");
  var sheet = document.getElementById("mobile-menu");
  if (!burger || !overlay || !sheet) return;

  function setMenu(open) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    overlay.hidden = !open;
    sheet.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    if (open) sheet.querySelector("a").focus();
  }

  burger.addEventListener("click", function () {
    setMenu(burger.getAttribute("aria-expanded") !== "true");
  });
  overlay.addEventListener("click", function () { setMenu(false); });
  sheet.addEventListener("click", function (e) {
    if (e.target.tagName === "A") setMenu(false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 720) setMenu(false);
  });
})();
