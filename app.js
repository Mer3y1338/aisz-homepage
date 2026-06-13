const siteName = "词元枢阁 Token Nexus";
const typeTarget = document.getElementById("typewriter");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

async function typeSiteName() {
  if (!typeTarget) return;
  const isCompact = () => window.matchMedia("(max-width: 560px)").matches;
  const renderText = (text) => {
    if (isCompact()) {
      typeTarget.innerHTML = text.replace(" Token", "<br>Token");
      return;
    }
    typeTarget.textContent = text;
  };

  if (reducedMotion) {
    renderText(siteName);
    return;
  }

  let typed = "";
  renderText("");
  for (const char of siteName) {
    typed += char;
    renderText(typed);
    await new Promise((resolve) => window.setTimeout(resolve, char === " " ? 90 : 72));
  }
}

function setActiveSection(sectionId) {
  document.body.dataset.current = sectionId;

  document.querySelectorAll("[data-nav]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.nav === sectionId);
  });

  document.querySelectorAll("[data-dot]").forEach((dot) => {
    dot.classList.toggle("is-active", dot.dataset.dot === sectionId);
  });

  document.querySelectorAll("[data-logo-stage]").forEach((stage) => {
    const shouldActivate = stage.dataset.logoStage === sectionId;
    if (shouldActivate && !stage.classList.contains("is-active")) {
      stage.classList.remove("is-active");
      void stage.offsetWidth;
      stage.classList.add("is-active");
      return;
    }

    stage.classList.toggle("is-active", shouldActivate);
  });
}

function initSectionObserver() {
  const sections = [...document.querySelectorAll("[data-section]")];
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visible) {
        setActiveSection(visible.target.dataset.section);
      }
    },
    {
      threshold: [0.38, 0.55, 0.72],
    },
  );

  sections.forEach((section) => observer.observe(section));
}

function initPlatformTabs() {
  const switcher = document.querySelector(".switcher");
  if (!switcher) return;

  switcher.addEventListener("click", (event) => {
    const button = event.target.closest("[data-platform]");
    if (!button) return;

    const platform = button.dataset.platform;
    switcher.querySelectorAll("[data-platform]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });

    document.querySelectorAll("[data-platform-pane]").forEach((pane) => {
      pane.classList.toggle("is-active", pane.dataset.platformPane === platform);
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

function initHashLanding() {
  const land = () => {
    if (!window.location.hash) return;

    const target = document.querySelector(window.location.hash);
    if (!target) return;

    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    target.scrollIntoView({ block: "start" });
    window.requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousBehavior;
    });
  };

  window.addEventListener("load", () => window.setTimeout(land, 80));
}

typeSiteName();
initSectionObserver();
initPlatformTabs();
initCopyButtons();
initHashLanding();
