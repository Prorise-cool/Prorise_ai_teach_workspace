(() => {
  if (window.__XIAOMAI_PAGE_HUB__) {
    return;
  }

  const script = document.currentScript;
  if (!script) {
    return;
  }

  window.__XIAOMAI_PAGE_HUB__ = true;

  const rootUrl = new URL("../", script.src);
  const pageGroups = [
    {
      title: "首页与入口",
      items: [
        { label: "产品落地页", note: "Marketing", path: "01-正式路由页面/01-首页与入口/01-landingPage.html" },
        { label: "首页双入口", note: "Home", path: "01-正式路由页面/01-首页与入口/02-home.html" },
        { label: "登录页", note: "Auth", path: "01-正式路由页面/02-认证页/01-login.html" }
      ]
    },
    {
      title: "视频链路",
      items: [
        { label: "视频输入", note: "Video Input", path: "01-正式路由页面/03-视频输入页/01-input.html" },
        { label: "视频等待", note: "Video Generating", path: "01-正式路由页面/04-视频等待页/01-generating.html" },
        { label: "视频结果", note: "Video Result", path: "01-正式路由页面/05-视频结果页/02-video-result.html" }
      ]
    },
    {
      title: "课堂链路",
      items: [
        { label: "课堂输入", note: "Classroom Input", path: "01-正式路由页面/06-课堂输入页/01-input.html" },
        { label: "课堂等待", note: "Classroom Generating", path: "01-正式路由页面/07-课堂等待页/01-generating.html" },
        { label: "课堂结果", note: "Classroom Result", path: "01-正式路由页面/08-课堂结果页/01-classroom.html" }
      ]
    },
    {
      title: "学习闭环",
      items: [
        { label: "Checkpoint 入口", note: "Entry", path: "01-正式路由页面/10-Checkpoint 与 Quiz 页/01-entry.html" },
        { label: "Checkpoint 页", note: "Checkpoint", path: "01-正式路由页面/10-Checkpoint 与 Quiz 页/02-checkpoint.html" },
        { label: "Quiz 页", note: "Quiz", path: "01-正式路由页面/10-Checkpoint 与 Quiz 页/03-quiz.html" },
        { label: "学习路径", note: "Path", path: "01-正式路由页面/11-学习路径页/01-path.html" },
        { label: "学习中心", note: "Learning", path: "01-正式路由页面/12-学习中心页/01-learning.html" }
      ]
    },
    {
      title: "个人域",
      items: [
        { label: "个人资料", note: "Profile", path: "01-正式路由页面/13-个人资料页/01-profile.html" },
        { label: "历史记录", note: "History", path: "01-正式路由页面/14-历史记录页/01-history.html" },
        { label: "收藏页", note: "Favorites", path: "01-正式路由页面/15-收藏页/01-favorites.html" },
        { label: "设置页", note: "Settings", path: "01-正式路由页面/16-设置页/01-settings.html" }
      ]
    },
    {
      title: "共享状态",
      items: [
        { label: "共享导航", note: "Shared Nav", path: "02-共享交互与通用状态/01-任务等待与进度/nav.html" },
        { label: "403 状态页", note: "Error 403", path: "02-共享交互与通用状态/02-通用反馈状态/error-403.html" }
      ]
    }
  ];

  const currentPathname = decodeURIComponent(window.location.pathname.replace(/\\/g, "/"));
  const marker = "/04-成品图/";
  const currentRelativePath = currentPathname.includes(marker)
    ? currentPathname.split(marker)[1]
    : "";

  let currentPageLabel = "当前页面";

  const groupsWithHref = pageGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const href = new URL(item.path, rootUrl).href;
      const active = Boolean(currentRelativePath) && currentRelativePath.endsWith(item.path);

      if (active) {
        currentPageLabel = item.label;
      }

      return { ...item, href, active };
    })
  }));

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --xm-hub-brand: #f5c547;
      --xm-hub-brand-dark: #e6b841;
      --xm-hub-text: #3b1701;
      --xm-hub-muted: #6b4421;
      --xm-hub-border: #e6dcc8;
      --xm-hub-surface: #fffdfa;
      --xm-hub-surface-alt: #f8efe2;
      --xm-hub-shadow: 0 24px 60px rgba(59, 23, 1, 0.18);
      --xm-hub-overlay: rgba(59, 23, 1, 0.16);
    }

    html.dark {
      --xm-hub-brand: #e6b841;
      --xm-hub-text: #f5ede1;
      --xm-hub-muted: #c4b8a8;
      --xm-hub-border: #3d3630;
      --xm-hub-surface: #221d1a;
      --xm-hub-surface-alt: #2a2420;
      --xm-hub-shadow: 0 24px 60px rgba(0, 0, 0, 0.36);
      --xm-hub-overlay: rgba(0, 0, 0, 0.32);
    }

    .xm-page-hub-toggle {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 2147483646;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border: 1px solid var(--xm-hub-border);
      border-radius: 999px;
      background: var(--xm-hub-surface);
      color: var(--xm-hub-text);
      box-shadow: var(--xm-hub-shadow);
      font-family: "Inter", "Noto Sans SC", sans-serif;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
    }

    .xm-page-hub-toggle:hover {
      transform: translateY(-1px);
    }

    .xm-page-hub-toggle:focus-visible,
    .xm-page-hub-link:focus-visible,
    .xm-page-hub-close:focus-visible {
      outline: 2px solid var(--xm-hub-brand);
      outline-offset: 2px;
    }

    .xm-page-hub-toggle-mark {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: var(--xm-hub-brand);
      color: #3b1701;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .xm-page-hub-toggle-copy {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      line-height: 1.1;
      text-align: left;
    }

    .xm-page-hub-toggle-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .xm-page-hub-toggle-subtitle {
      margin-top: 3px;
      font-size: 11px;
      color: var(--xm-hub-muted);
    }

    .xm-page-hub-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483644;
      background: var(--xm-hub-overlay);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .xm-page-hub-panel {
      position: fixed;
      right: 24px;
      bottom: 88px;
      z-index: 2147483645;
      width: min(380px, calc(100vw - 32px));
      max-height: min(76vh, 760px);
      display: flex;
      flex-direction: column;
      border: 1px solid var(--xm-hub-border);
      border-radius: 24px;
      background: var(--xm-hub-surface);
      color: var(--xm-hub-text);
      box-shadow: var(--xm-hub-shadow);
      opacity: 0;
      transform: translateY(12px);
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
      overflow: hidden;
      font-family: "Inter", "Noto Sans SC", sans-serif;
    }

    .xm-page-hub-panel.is-open,
    .xm-page-hub-overlay.is-open {
      opacity: 1;
      pointer-events: auto;
    }

    .xm-page-hub-panel.is-open {
      transform: translateY(0);
    }

    .xm-page-hub-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 18px 14px;
      border-bottom: 1px solid var(--xm-hub-border);
      background: var(--xm-hub-surface-alt);
    }

    .xm-page-hub-eyebrow {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--xm-hub-muted);
    }

    .xm-page-hub-heading {
      margin-top: 8px;
      font-size: 20px;
      font-weight: 900;
      line-height: 1.2;
    }

    .xm-page-hub-current {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--xm-hub-border);
      background: var(--xm-hub-surface);
      font-size: 12px;
      font-weight: 700;
      color: var(--xm-hub-muted);
    }

    .xm-page-hub-current strong {
      color: var(--xm-hub-text);
    }

    .xm-page-hub-close {
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border: 1px solid var(--xm-hub-border);
      border-radius: 999px;
      background: var(--xm-hub-surface);
      color: var(--xm-hub-text);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }

    .xm-page-hub-body {
      padding: 18px;
      overflow: auto;
      display: grid;
      gap: 16px;
    }

    .xm-page-hub-group {
      display: grid;
      gap: 10px;
    }

    .xm-page-hub-group-title {
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--xm-hub-muted);
    }

    .xm-page-hub-links {
      display: grid;
      gap: 8px;
    }

    .xm-page-hub-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--xm-hub-border);
      border-radius: 16px;
      background: var(--xm-hub-surface);
      color: inherit;
      text-decoration: none;
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }

    .xm-page-hub-link:hover {
      transform: translateY(-1px);
      border-color: var(--xm-hub-brand);
      box-shadow: 0 12px 28px rgba(59, 23, 1, 0.12);
    }

    .xm-page-hub-link.is-active {
      background: var(--xm-hub-brand);
      border-color: var(--xm-hub-brand);
      color: #3b1701;
      box-shadow: none;
    }

    .xm-page-hub-link-copy {
      min-width: 0;
    }

    .xm-page-hub-link-label {
      font-size: 14px;
      font-weight: 800;
      line-height: 1.2;
    }

    .xm-page-hub-link-note {
      margin-top: 4px;
      font-size: 11px;
      color: var(--xm-hub-muted);
    }

    .xm-page-hub-link.is-active .xm-page-hub-link-note {
      color: rgba(59, 23, 1, 0.72);
    }

    .xm-page-hub-link-badge {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 54px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--xm-hub-border);
      background: var(--xm-hub-surface-alt);
      font-size: 11px;
      font-weight: 800;
      color: var(--xm-hub-muted);
    }

    .xm-page-hub-link.is-active .xm-page-hub-link-badge {
      border-color: rgba(59, 23, 1, 0.12);
      background: rgba(255, 255, 255, 0.42);
      color: #3b1701;
    }

    .xm-page-hub-footer {
      padding: 14px 18px 18px;
      border-top: 1px solid var(--xm-hub-border);
      font-size: 12px;
      color: var(--xm-hub-muted);
      background: var(--xm-hub-surface-alt);
    }

    @media (max-width: 640px) {
      .xm-page-hub-toggle {
        right: 16px;
        bottom: 16px;
        padding: 11px 14px;
      }

      .xm-page-hub-panel {
        right: 12px;
        bottom: 76px;
        width: calc(100vw - 24px);
      }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "xm-page-hub-overlay";

  const panel = document.createElement("section");
  panel.className = "xm-page-hub-panel";
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `
    <div class="xm-page-hub-header">
      <div>
        <div class="xm-page-hub-eyebrow">XiaoMai Route Hub</div>
        <div class="xm-page-hub-heading">成品图页面导航</div>
        <div class="xm-page-hub-current">当前页：<strong>${currentPageLabel}</strong></div>
      </div>
      <button class="xm-page-hub-close" type="button" aria-label="关闭页面导航">×</button>
    </div>
    <div class="xm-page-hub-body"></div>
    <div class="xm-page-hub-footer">仅补充跨页面跳转入口，不改动原页面主体设计。</div>
  `;

  const body = panel.querySelector(".xm-page-hub-body");
  groupsWithHref.forEach((group) => {
    const section = document.createElement("section");
    section.className = "xm-page-hub-group";

    const title = document.createElement("div");
    title.className = "xm-page-hub-group-title";
    title.textContent = group.title;
    section.appendChild(title);

    const list = document.createElement("div");
    list.className = "xm-page-hub-links";

    group.items.forEach((item) => {
      const link = document.createElement("a");
      link.className = `xm-page-hub-link${item.active ? " is-active" : ""}`;
      link.href = item.href;
      link.innerHTML = `
        <span class="xm-page-hub-link-copy">
          <span class="xm-page-hub-link-label">${item.label}</span>
          <span class="xm-page-hub-link-note">${item.note}</span>
        </span>
        <span class="xm-page-hub-link-badge">${item.active ? "当前" : "跳转"}</span>
      `;
      list.appendChild(link);
    });

    section.appendChild(list);
    body.appendChild(section);
  });

  const toggle = document.createElement("button");
  toggle.className = "xm-page-hub-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = `
    <span class="xm-page-hub-toggle-mark">导</span>
    <span class="xm-page-hub-toggle-copy">
      <span class="xm-page-hub-toggle-title">页面导航</span>
      <span class="xm-page-hub-toggle-subtitle">${currentPageLabel}</span>
    </span>
  `;

  const closeButton = panel.querySelector(".xm-page-hub-close");

  function setOpen(open) {
    overlay.classList.toggle("is-open", open);
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", () => {
    const nextOpen = !panel.classList.contains("is-open");
    setOpen(nextOpen);
  });

  overlay.addEventListener("click", () => setOpen(false));
  closeButton.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
    }
  });

  document.body.appendChild(overlay);
  document.body.appendChild(panel);
  document.body.appendChild(toggle);
})();
