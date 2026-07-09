const typePhrases = ["Mer3y Sense", "统一模型接入层"];
const typeTarget = document.getElementById("typewriter");
const deck = document.querySelector(".slide-deck");
const logoTravelLayer = document.querySelector(".logo-travel-layer");
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
let touchUsedScrollable = false;
let previewOffset = 0;
let pendingPreviewOffset = 0;
let previewFrame = 0;
let previewTransitionTimer = 0;
let logoTravelTimer = 0;
let logoTravelTargetId = "";
const logoStageTimers = new Map();
const travelLogoSections = new Set(["claude", "codex", "gemini"]);
const logoTravelMs = 860;
const logoTravelClearMs = 860;
const logoTravelBuildDelay = 160;

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

function getLogoActivationDelay(stageId) {
  if (reducedMotion) return 0;
  return stageId === logoTravelTargetId ? logoTravelBuildDelay : 0;
}

function logoAssetForSection(sectionId) {
  return {
    claude: {
      src: "./assets/claude.svg",
      core: "rgba(217, 119, 87, 0.5)",
      glow: "rgba(217, 119, 87, 0.28)",
    },
    codex: {
      src: "./assets/openai.svg",
      core: "rgba(20, 20, 19, 0.32)",
      glow: "rgba(20, 20, 19, 0.2)",
    },
    gemini: {
      src: "./assets/gemini.svg",
      core: "rgba(127, 109, 242, 0.5)",
      glow: "rgba(111, 125, 255, 0.3)",
    },
  }[sectionId];
}

function logoMotionRect(sectionId, slideDelta = 0) {
  const stage = document.querySelector(`[data-logo-stage="${sectionId}"]`);
  const logo = stage?.querySelector(".provider-build-svg, .openai-build-svg");
  if (!stage || !logo) return null;

  const rect = logo.getBoundingClientRect();
  const yOffset = slideDelta * getSlideHeight();
  return {
    left: rect.left,
    top: rect.top - yOffset,
    width: rect.width,
    height: rect.height,
    stage,
  };
}

function clearLogoTravel() {
  window.clearTimeout(logoTravelTimer);
  logoTravelTargetId = "";
  document.querySelectorAll(".model-emblem.is-travel-target").forEach((stage) => {
    stage.classList.remove("is-travel-target");
  });
  if (logoTravelLayer) {
    logoTravelLayer.textContent = "";
  }
}

function playLogoTravel(fromId, toId, slideDelta) {
  if (
    reducedMotion ||
    !logoTravelLayer ||
    fromId === toId ||
    !travelLogoSections.has(fromId) ||
    !travelLogoSections.has(toId)
  ) {
    return;
  }

  clearLogoTravel();

  const fromAsset = logoAssetForSection(fromId);
  const toAsset = logoAssetForSection(toId);
  const fromRect = logoMotionRect(fromId);
  const toRect = logoMotionRect(toId, slideDelta);
  if (!fromAsset || !toAsset || !fromRect || !toRect) {
    return;
  }
  logoTravelTargetId = toId;

  const size = Math.max(fromRect.width, fromRect.height, toRect.width, toRect.height);
  const fromX = fromRect.left + fromRect.width / 2 - size / 2;
  const fromY = fromRect.top + fromRect.height / 2 - size / 2;
  const toX = toRect.left + toRect.width / 2 - size / 2;
  const toY = toRect.top + toRect.height / 2 - size / 2;

  const makeGhost = (sectionId, asset) => {
    const ghost = document.createElement("span");
    ghost.className = "logo-travel-ghost is-out";
    ghost.dataset.provider = sectionId;
    ghost.style.setProperty("--travel-size", `${size}px`);
    ghost.style.setProperty("--travel-from-x", `${fromX}px`);
    ghost.style.setProperty("--travel-from-y", `${fromY}px`);
    ghost.style.setProperty("--travel-to-x", `${toX}px`);
    ghost.style.setProperty("--travel-to-y", `${toY}px`);
    ghost.style.setProperty("--travel-core", asset.core);
    ghost.style.setProperty("--travel-glow", asset.glow);
    ghost.style.animationDuration = `${logoTravelMs}ms, ${logoTravelMs}ms`;
    ghost.innerHTML = `<img src="${asset.src}" alt="" aria-hidden="true" />`;
    return ghost;
  };

  const leavingGhost = makeGhost(fromId, fromAsset);

  toRect.stage.classList.add("is-travel-target");
  logoTravelLayer.append(leavingGhost);
  logoTravelTimer = window.setTimeout(() => {
    logoTravelTargetId = "";
    toRect.stage.classList.remove("is-travel-target");
    leavingGhost.remove();
  }, logoTravelClearMs);
}

function setActiveSection(sectionId) {
  document.body.dataset.current = sectionId;

  sections.forEach((section) => {
    const isActive = section.dataset.section === sectionId;
    section.inert = !isActive;
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
    window.clearTimeout(logoStageTimers.get(stage));
    logoStageTimers.delete(stage);

    if (shouldActivate) {
      stage.classList.remove("is-active");
      const activationDelay = getLogoActivationDelay(stage.dataset.logoStage);

      if (activationDelay) {
        const timer = window.setTimeout(() => {
          logoStageTimers.delete(stage);
          if (document.body.dataset.current === sectionId) {
            restartClass(stage, "is-active");
          }
        }, activationDelay);
        logoStageTimers.set(stage, timer);
        return;
      }

      restartClass(stage, "is-active");
      return;
    }
    stage.classList.remove("is-active");
  });
}

function getViewportHeight() {
  return window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight;
}

function getSlideHeight() {
  return sections[0]?.getBoundingClientRect().height || getViewportHeight();
}

function formatDeckTransform(index, offsetPx = 0) {
  const base = index * getSlideHeight();
  return `translate3d(0, -${base - offsetPx}px, 0)`;
}

function easeOutDistance(progress) {
  const normalized = Math.max(0, Math.min(progress, 1));
  return 1 - (1 - normalized) ** 2;
}

function canMove(direction) {
  const nextIndex = currentIndex + direction;
  return nextIndex >= 0 && nextIndex < sections.length;
}

function findScrollableTarget(target, direction) {
  let node = target instanceof Element ? target : target?.parentElement;

  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const allowsScroll = ["auto", "scroll", "overlay"].includes(style.overflowY);
    const hasOverflow = node.scrollHeight > node.clientHeight + 1;

    if (allowsScroll && hasOverflow) {
      const atTop = node.scrollTop <= 0;
      const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;

      if ((direction < 0 && !atTop) || (direction > 0 && !atBottom)) {
        return node;
      }
    }

    node = node.parentElement;
  }

  return null;
}

function previewDistanceFromIntent(intent, threshold, maxRatio, direction) {
  const maxDistance = getSlideHeight() * maxRatio;
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

function updateHash(sectionId, { replace = false } = {}) {
  const nextHash = `#${sectionId}`;
  if (window.location.hash === nextHash) return;
  if (replace) {
    window.history.replaceState(null, "", nextHash);
  } else {
    window.history.pushState(null, "", nextHash);
  }
}

function unlockAfterTransition() {
  window.setTimeout(() => {
    isSwitching = false;
  }, transitionMs);
}

function goToSection(index, options = {}) {
  const nextIndex = clampIndex(index);
  const immediate = Boolean(options.immediate);
  const updateUrl = options.updateUrl !== false;
  const previousIndex = currentIndex;
  const previousSectionId = sectionIdAt(previousIndex);

  if (nextIndex === currentIndex) return false;

  const sectionId = sectionIdAt(nextIndex);
  const slideDelta = nextIndex - previousIndex;
  if (immediate) {
    clearLogoTravel();
  } else {
    playLogoTravel(previousSectionId, sectionId, slideDelta);
  }

  currentIndex = nextIndex;
  clearWheelIntent(false);
  applyDeckPosition(immediate);
  setActiveSection(sectionId);

  if (updateUrl) {
    updateHash(sectionId, { replace: Boolean(options.replaceUrl) });
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
  goToSection(currentIndex + delta, { replaceUrl: true });
}

function normalizeWheelDelta(event) {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * getSlideHeight();
  return event.deltaY;
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
      if (event.ctrlKey) return;

      const deltaY = normalizeWheelDelta(event);
      if (Math.abs(deltaY) < 2) return;

      const direction = Math.sign(deltaY);
      if (findScrollableTarget(event.target, direction)) {
        clearWheelIntent(false);
        return;
      }

      event.preventDefault();

      if (isSwitching) return;

      if (direction !== wheelDirection) {
        wheelIntent = 0;
        wheelDirection = direction;
      }

      wheelIntent += deltaY;
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
        goToSection(currentIndex + direction, { replaceUrl: true });
      } else {
        clearWheelIntent();
      }
    },
    { passive: false },
  );

  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || isSwitching) return;
    if (event.target.closest("a, button, input, textarea, select, [role='button']")) return;

    const downKeys = ["ArrowDown", "PageDown", " "];
    const upKeys = ["ArrowUp", "PageUp"];

    if (downKeys.includes(event.key)) {
      event.preventDefault();
      moveBy(1);
    } else if (upKeys.includes(event.key)) {
      event.preventDefault();
      moveBy(-1);
    }
  });

  window.addEventListener(
    "touchstart",
    (event) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
      touchCurrentY = touchStartY;
      touchUsedScrollable = false;
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
      if (findScrollableTarget(event.target, direction)) {
        touchUsedScrollable = true;
        settleDeckPreview();
        return;
      }

      event.preventDefault();

      const previewDistance = previewDistanceFromIntent(
        deltaY,
        touchThreshold,
        touchPreviewRatio,
        direction,
      );
      previewDeckOffset(-direction * previewDistance);
    },
    { passive: false },
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

      if (touchUsedScrollable) {
        touchUsedScrollable = false;
        settleDeckPreview();
        return;
      }

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
    touchUsedScrollable = false;
    settleDeckPreview();
  });

  window.addEventListener("hashchange", () => {
    const targetId = window.location.hash.replace("#", "") || sectionIdAt(0);
    goToSectionId(targetId, { updateUrl: false });
  });
}

function initPlatformTabs() {
  const activatePlatformTab = (switcher, button, shouldFocus = false) => {
    const platform = button.dataset.platform;
    const scope = switcher.closest(".stack-cards") || document;

    switcher.querySelectorAll("[data-platform]").forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", String(isActive));
      item.tabIndex = isActive ? 0 : -1;
    });

    scope.querySelectorAll("[data-platform-pane]").forEach((pane) => {
      const isActive = pane.dataset.platformPane === platform;
      pane.classList.toggle("is-active", isActive);
      pane.hidden = !isActive;
    });

    if (shouldFocus) {
      button.focus();
    }
  };

  document.querySelectorAll(".switcher").forEach((switcher) => {
    switcher.addEventListener("click", (event) => {
      const button = event.target.closest("[data-platform]");
      if (!button) return;

      activatePlatformTab(switcher, button);
    });

    switcher.addEventListener("keydown", (event) => {
      const button = event.target.closest("[data-platform]");
      if (!button || !switcher.contains(button)) return;

      const tabs = [...switcher.querySelectorAll("[data-platform]")];
      const currentTabIndex = tabs.indexOf(button);
      let nextTabIndex = currentTabIndex;

      if (event.key === "ArrowRight") {
        nextTabIndex = (currentTabIndex + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        nextTabIndex = (currentTabIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextTabIndex = 0;
      } else if (event.key === "End") {
        nextTabIndex = tabs.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      activatePlatformTab(switcher, tabs[nextTabIndex], true);
    });
  });
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the legacy path (insecure context, denied permission, …)
    }
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  helper.remove();
  return copied;
}

async function copyText(button) {
  const target = button.dataset.copyTarget;
  const node =
    target === "active-pane"
      ? button.closest(".code-window")?.querySelector(".code-pane.is-active code")
      : document.querySelector(target);

  if (!node) return;

  const text = node.textContent.trim();
  const copied = await writeClipboard(text);

  if (copied) {
    button.classList.add("is-copied");
    const original = button.textContent;
    button.textContent = "已复制";
    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.textContent = original;
    }, 1300);
  } else {
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
  updateHash(sectionIdAt(currentIndex), { replace: true });
}

initInitialSection();
typeSiteName();
initPptNavigation();
initPlatformTabs();
initCopyButtons();

window.addEventListener("resize", () => applyDeckPosition(true));
