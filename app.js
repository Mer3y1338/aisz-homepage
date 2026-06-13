const typePhrases = ["Mer3y Sense"];
const typeTarget = document.getElementById("typewriter");
const deck = document.querySelector(".slide-deck");
const sections = [...document.querySelectorAll("[data-section]")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const transitionMs = reducedMotion ? 120 : 920;
const wheelThreshold = 220;
const touchThreshold = 86;

let currentIndex = 0;
let wheelIntent = 0;
let wheelDirection = 0;
let wheelResetTimer = 0;
let isSwitching = false;
let touchStartY = 0;

function clampIndex(index) {
  return Math.max(0, Math.min(index, sections.length - 1));
}

function sectionIdAt(index) {
  return sections[index]?.dataset.section ?? "home";
}

function indexForSection(sectionId) {
  const foundIndex = sections.findIndex((section) => section.dataset.section === sectionId);
  return foundIndex === -1 ? 0 : foundIndex;
}

async function typeSiteName() {
  if (!typeTarget) return;
  const renderText = (text) => {
    typeTarget.textContent = text;
  };

  if (reducedMotion) {
    renderText(typePhrases[0]);
    return;
  }

  const wait = (delay) => new Promise((resolve) => window.setTimeout(resolve, delay));

  while (true) {
    for (const phrase of typePhrases) {
      let typed = "";
      renderText("");

      for (const char of phrase) {
        typed += char;
        renderText(typed);
        await wait(char === " " ? 90 : 72);
      }

      await wait(1350);

      while (typed.length) {
        typed = typed.slice(0, -1);
        renderText(typed);
        await wait(38);
      }

      await wait(260);
    }
  }
}

function restartClass(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

function setActiveSection(sectionId) {
  document.body.dataset.current = sectionId;

  sections.forEach((section) => {
    const isActive = section.dataset.section === sectionId;
    if (isActive) {
      restartClass(section, "is-active-section");
      return;
    }
    section.classList.remove("is-active-section");
  });

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.nav === sectionId);
  });

  document.querySelectorAll("[data-dot]").forEach((dot) => {
    dot.classList.toggle("is-active", dot.dataset.dot === sectionId);
  });

  document.querySelectorAll("[data-logo-stage]").forEach((stage) => {
    const shouldActivate = stage.dataset.logoStage === sectionId;
    if (shouldActivate) {
      restartClass(stage, "is-active");
      return;
    }
    stage.classList.remove("is-active");
  });
}

function applyDeckPosition(immediate = false) {
  if (!deck) return;

  if (immediate) {
    deck.style.transitionDuration = "0ms";
  }

  deck.style.transform = `translate3d(0, -${currentIndex * 100}svh, 0)`;

  if (immediate) {
    window.requestAnimationFrame(() => {
      deck.style.transitionDuration = "";
    });
  }
}

function updateHash(sectionId) {
  const nextHash = `#${sectionId}`;
  if (window.location.hash === nextHash) return;
  window.history.replaceState(null, "", nextHash);
}

function unlockAfterTransition() {
  window.setTimeout(() => {
    isSwitching = false;
  }, transitionMs);
}

function goToSection(index, options = {}) {
  const nextIndex = clampIndex(index);
  const force = Boolean(options.force);
  const immediate = Boolean(options.immediate);
  const updateUrl = options.updateUrl !== false;

  if (nextIndex === currentIndex && !force) return false;

  currentIndex = nextIndex;
  const sectionId = sectionIdAt(currentIndex);
  applyDeckPosition(immediate);
  setActiveSection(sectionId);

  if (updateUrl) {
    updateHash(sectionId);
  }

  if (!immediate) {
    isSwitching = true;
    unlockAfterTransition();
  }

  return true;
}

function goToSectionId(sectionId, options = {}) {
  return goToSection(indexForSection(sectionId), options);
}

function moveBy(delta) {
  if (isSwitching) return;
  goToSection(currentIndex + delta);
}

function initPptNavigation() {
  if (!deck || !sections.length) return;

  document.querySelectorAll("[data-nav], [data-dot], .down-cue").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      const targetId =
        trigger.dataset.nav ||
        trigger.dataset.dot ||
        trigger.getAttribute("href")?.replace("#", "");

      if (!targetId) return;
      event.preventDefault();
      goToSectionId(targetId);
    });
  });

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < 2) return;
      event.preventDefault();

      if (isSwitching) return;

      const direction = Math.sign(event.deltaY);
      if (direction !== wheelDirection) {
        wheelIntent = 0;
        wheelDirection = direction;
      }

      wheelIntent += event.deltaY;
      window.clearTimeout(wheelResetTimer);
      wheelResetTimer = window.setTimeout(() => {
        wheelIntent = 0;
        wheelDirection = 0;
      }, 180);

      if (Math.abs(wheelIntent) < wheelThreshold) return;

      const moved = goToSection(currentIndex + direction);
      wheelIntent = 0;
      wheelDirection = 0;

      if (!moved) {
        isSwitching = false;
      }
    },
    { passive: false },
  );

  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || isSwitching) return;

    const activeElement = document.activeElement;
    if (activeElement?.matches("button, a, input, textarea, select")) return;

    const downKeys = ["ArrowDown", "PageDown", " "];
    const upKeys = ["ArrowUp", "PageUp"];

    if (downKeys.includes(event.key)) {
      event.preventDefault();
      moveBy(1);
    }

    if (upKeys.includes(event.key)) {
      event.preventDefault();
      moveBy(-1);
    }
  });

  window.addEventListener(
    "touchstart",
    (event) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchend",
    (event) => {
      if (isSwitching || !touchStartY) return;

      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const deltaY = touchStartY - endY;
      touchStartY = 0;

      if (Math.abs(deltaY) < touchThreshold) return;
      moveBy(Math.sign(deltaY));
    },
    { passive: true },
  );

  window.addEventListener("hashchange", () => {
    const targetId = window.location.hash.replace("#", "");
    if (!targetId) return;
    goToSectionId(targetId, { updateUrl: false });
  });
}

function initPlatformTabs() {
  document.querySelectorAll(".switcher").forEach((switcher) => {
    switcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-platform]");
      if (!button) return;

      const platform = button.dataset.platform;
      switcher.querySelectorAll("[data-platform]").forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
        item.tabIndex = isActive ? 0 : -1;
      });

      document.querySelectorAll("[data-platform-pane]").forEach((pane) => {
        const isActive = pane.dataset.platformPane === platform;
        pane.classList.toggle("is-active", isActive);
        pane.hidden = !isActive;
      });
    });
  });
}

async function copyText(button) {
  const target = button.dataset.copyTarget;
  const node =
    target === "active-claude"
      ? document.querySelector(".claude-code .code-pane.is-active code")
      : document.querySelector(target);

  if (!node) return;

  const text = node.textContent.trim();
  try {
    await navigator.clipboard.writeText(text);
    button.classList.add("is-copied");
    const original = button.textContent;
    button.textContent = "已复制";
    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.textContent = original;
    }, 1300);
  } catch {
    button.textContent = "复制失败";
    window.setTimeout(() => {
      button.textContent = "复制";
    }, 1300);
  }
}

function initCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", () => copyText(button));
  });
}

function initInitialSection() {
  const initialId = window.location.hash.replace("#", "");
  currentIndex = initialId ? indexForSection(initialId) : 0;
  applyDeckPosition(true);
  setActiveSection(sectionIdAt(currentIndex));

  if (!initialId) {
    updateHash(sectionIdAt(currentIndex));
  }
}

initInitialSection();
typeSiteName();
initPptNavigation();
initPlatformTabs();
initCopyButtons();
