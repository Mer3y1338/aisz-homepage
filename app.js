const typePhrases = ["Mer3y Sense"];
const typeTarget = document.getElementById("typewriter");
const deck = document.querySelector(".slide-deck");
const sections = [...document.querySelectorAll("[data-section]")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const transitionMs = reducedMotion ? 120 : 920;
const wheelThreshold = 220;
const touchThreshold = 86;
const wheelPreviewRatio = 0.12;
const touchPreviewRatio = 0.22;
const wheelPreviewMs = 110;
const wheelSettleDelay = 360;

let currentIndex = 0;
let wheelIntent = 0;
let wheelDirection = 0;
let wheelResetTimer = 0;
let isSwitching = false;
let touchStartY = 0;
let touchCurrentY = 0;
let previewOffset = 0;
let pendingPreviewOffset = 0;
let previewFrame = 0;
let previewTransitionTimer = 0;

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

function getViewportHeight() {
  return window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight;
}

function formatDeckTransform(index, offsetPx = 0) {
  const operator = offsetPx < 0 ? "-" : "+";
  return `translate3d(0, calc(-${index * 100}svh ${operator} ${Math.abs(offsetPx)}px), 0)`;
}

function easeOutDistance(progress) {
  const normalized = Math.max(0, Math.min(progress, 1));
  return 1 - (1 - normalized) ** 2;
}

function canMove(direction) {
  const nextIndex = currentIndex + direction;
  return nextIndex >= 0 && nextIndex < sections.length;
}

function previewDistanceFromIntent(intent, threshold, maxRatio, direction) {
  const maxDistance = getViewportHeight() * maxRatio;
  const edgeFactor = canMove(direction) ? 1 : 0.32;
  return maxDistance * edgeFactor * easeOutDistance(Math.abs(intent) / threshold);
}

function previewDeckOffset(offsetPx, options = {}) {
  if (!deck || reducedMotion) return;
  const duration = options.duration ?? 0;
  pendingPreviewOffset = offsetPx;
  if (previewFrame) return;

  previewFrame = window.requestAnimationFrame(() => {
    previewFrame = 0;
    previewOffset = pendingPreviewOffset;
    window.clearTimeout(previewTransitionTimer);
    deck.style.transitionDuration = `${duration}ms`;
    deck.style.transform = formatDeckTransform(currentIndex, previewOffset);
  });
}

function settleDeckPreview(duration = 180) {
  if (!deck || previewOffset === 0) return;
  if (previewFrame) {
    window.cancelAnimationFrame(previewFrame);
    previewFrame = 0;
  }
  previewOffset = 0;
  pendingPreviewOffset = 0;
  window.clearTimeout(previewTransitionTimer);
  deck.style.transitionDuration = `${duration}ms`;
  deck.style.transform = formatDeckTransform(currentIndex, 0);
  previewTransitionTimer = window.setTimeout(() => {
    if (!isSwitching) {
      deck.style.transitionDuration = "";
    }
  }, duration);
}

function clearWheelIntent(shouldSettle = true) {
  window.clearTimeout(wheelResetTimer);
  wheelIntent = 0;
  wheelDirection = 0;
  if (shouldSettle) {
    settleDeckPreview();
  }
}

function applyDeckPosition(immediate = false) {
  if (!deck) return;
  if (previewFrame) {
    window.cancelAnimationFrame(previewFrame);
    previewFrame = 0;
  }
  window.clearTimeout(previewTransitionTimer);

  if (immediate) {
    deck.style.transitionDuration = "0ms";
  } else {
    deck.style.transitionDuration = "";
  }

  previewOffset = 0;
  pendingPreviewOffset = 0;
  deck.style.transform = formatDeckTransform(currentIndex, 0);

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
  clearWheelIntent(false);
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
        clearWheelIntent();
      }, wheelSettleDelay);

      const previewDistance = previewDistanceFromIntent(
        wheelIntent,
        wheelThreshold,
        wheelPreviewRatio,
        direction,
      );
      previewDeckOffset(-direction * previewDistance, { duration: wheelPreviewMs });

      if (Math.abs(wheelIntent) < wheelThreshold) return;

      if (canMove(direction)) {
        goToSection(currentIndex + direction);
      } else {
        clearWheelIntent();
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
      touchCurrentY = touchStartY;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (isSwitching || !touchStartY) return;

      touchCurrentY = event.touches[0]?.clientY ?? touchCurrentY;
      const deltaY = touchStartY - touchCurrentY;
      if (Math.abs(deltaY) < 2) return;

      const direction = Math.sign(deltaY);
      const previewDistance = previewDistanceFromIntent(
        deltaY,
        touchThreshold,
        touchPreviewRatio,
        direction,
      );
      previewDeckOffset(-direction * previewDistance);
    },
    { passive: true },
  );

  window.addEventListener(
    "touchend",
    (event) => {
      if (isSwitching || !touchStartY) return;

      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const deltaY = touchStartY - endY;
      const direction = Math.sign(deltaY);
      touchStartY = 0;
      touchCurrentY = 0;

      if (Math.abs(deltaY) < touchThreshold) {
        settleDeckPreview();
        return;
      }

      if (canMove(direction)) {
        moveBy(direction);
        return;
      }

      settleDeckPreview();
    },
    { passive: true },
  );

  window.addEventListener("touchcancel", () => {
    touchStartY = 0;
    touchCurrentY = 0;
    settleDeckPreview();
  });

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
