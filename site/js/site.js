/* 官网公共脚本：导航、页脚、复制按钮、账号 API helper。
   API 与官网同源（Caddy 把 /api/* 反代到许可证服务），所以没有跨域、没有第三方请求。 */

const NAV = [
  ["index.html", "产品"],
  ["pricing.html", "套餐"],
  ["download.html", "下载"],
  ["docs.html", "文档"],
  ["account.html", "账号"],
];

function currentPage() {
  const name = location.pathname.split("/").pop();
  return name && name !== "" ? name : "index.html";
}

function injectChrome() {
  const current = currentPage();

  const header = document.createElement("header");
  header.className = "www-header";
  header.innerHTML = `<div class="www-bar">
    <a class="www-brand" href="index.html"><span class="www-mark"><i></i></span>Enclave</a>
    <nav class="www-nav">${NAV.map(
      ([href, label]) =>
        `<a href="${href}"${current === href ? ' data-active="true" aria-current="page"' : ""}>${label}</a>`,
    ).join("")}</nav>
  </div>`;

  const footer = document.createElement("footer");
  footer.className = "www-footer";
  footer.innerHTML = `<div class="www-foot">
    <div>Enclave · 本机多环境浏览器</div>
    <div><a href="docs.html">文档</a> · <a href="download.html">下载与校验</a> · <a href="legal.html">安全与法律</a></div>
  </div>`;

  document.body.prepend(header);
  document.body.append(footer);
}

/* 复制按钮：任何 [data-copy] 元素，值就是要复制的文本 */
function wireCopy() {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;
    const text = btn.getAttribute("data-copy") || "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    const original = btn.textContent;
    btn.textContent = "已复制";
    btn.dataset.done = "true";
    setTimeout(() => {
      btn.textContent = original;
      delete btn.dataset.done;
    }, 1600);
  });
}

/* ── 账号 API ────────────────────────────────────────────
   会话是同源 HttpOnly cookie，浏览器自己带，前端不碰 token。 */

const API = "/api";

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || (data && data.ok === false)) {
    const err = new Error((data && data.message) || `请求失败（${res.status}）`);
    err.code = (data && data.code) || `HTTP_${res.status}`;
    throw err;
  }
  return data;
}

document.addEventListener("DOMContentLoaded", () => {
  injectChrome();
  wireCopy();
});
