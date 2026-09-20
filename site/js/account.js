/* 账号页：注册、登录、档位、设备、升级申请、联系表单。
   会话是同源 HttpOnly cookie，这里不碰任何令牌。 */

/* 档位只在许可证服务里定义。这里不抄数字：当前档位来自 /auth/me，可选档位来自 /plans。 */
let PLANS = [];

const describe = (p) => `${p.envLimit} 个环境 · ${p.concurrent} 个同时运行 · ${p.deviceLimit} 台设备`;
const labelOf = (id) => PLANS.find((p) => p.plan === id)?.label ?? id;

const panel = document.getElementById("panel");
const titleEl = document.getElementById("title");
const leadEl = document.getElementById("lead");

function fmtDate(ms) {
  return ms ? new Date(ms).toLocaleDateString("zh-CN") : "不过期";
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/* ── 已登录 ─────────────────────────────────────────────── */

function renderAccount(state) {
  const { user, license, devices, pendingRequest } = state;
  titleEl.textContent = "你的账号";
  leadEl.textContent = "档位在工作台登录后自动同步。环境数据始终只在你本机。";
  panel.replaceChildren();

  panel.append(el("p", "www-overline", "已登录"), el("h3", null, user.email));

  const kv = el("table", "www-kv");
  const tbody = document.createElement("tbody");
  const rows = [
    ["当前档位", license.label],
    ["额度", `${license.envLimit} 个环境 · ${license.concurrent} 个同时运行`],
    ["到期", license.expiredPlan ? `${license.expiredPlan} 已于 ${fmtDate(license.expiredAt)} 到期` : fmtDate(license.expiresAt)],
    ["已绑设备", `${devices.length} / ${license.deviceLimit}`],
  ];
  for (const [k, v] of rows) {
    const tr = document.createElement("tr");
    tr.append(el("td", null, k), el("td", "www-mono", v));
    tbody.append(tr);
  }
  kv.append(tbody);
  panel.append(kv);

  if (devices.length) {
    panel.append(el("p", "www-overline", "设备"));
    const wrap = el("div", "www-table-wrap www-scroll u-mb-6");
    const table = document.createElement("table");
    const body = document.createElement("tbody");
    for (const d of devices) {
      const tr = document.createElement("tr");
      const actions = el("td", "u-right");
      const btn = el("button", "www-unbind", "解绑");
      btn.type = "button";
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = "解绑中…";
        try {
          await api(`/devices/${encodeURIComponent(d.id)}`, { method: "DELETE" });
          load();
        } catch (e) {
          btn.disabled = false;
          btn.textContent = "解绑失败";
          console.error(e);
        }
      };
      actions.append(btn);
      tr.append(el("td", null, d.name), el("td", "www-mono", fmtDate(d.lastSeenAt)), actions);
      body.append(tr);
    }
    table.append(body);
    wrap.append(table);
    panel.append(wrap);
  } else {
    panel.append(
      el("p", "www-note u-mb-6", "还没有设备登录过。安装工作台后在里面登录同一个账号即可。"),
    );
  }

  panel.append(renderUpgrade(license.plan, pendingRequest));

  const actions = el("div", "www-actions");
  const out = el("button", "www-btn www-btn-secondary", "退出登录");
  out.type = "button";
  out.onclick = async () => {
    await api("/auth/logout", { method: "POST" });
    load();
  };
  actions.append(out);
  panel.append(actions);
}

/* ── 升级申请 ───────────────────────────────────────────── */

function renderUpgrade(plan, pending) {
  const box = document.createElement("div");

  if (pending) {
    box.append(
      el("p", "www-overline", "升级申请"),
      el(
        "p",
        "www-ok",
        `已收到你对 ${labelOf(pending.plan)} 的申请（${fmtDate(pending.createdAt)}）。` +
          "我们会在一个工作日内用这个邮箱联系你，告知价格和开通方式。",
      ),
    );
    return box;
  }

  box.append(el("p", "www-overline", plan === "free" ? "升级" : "调整档位"));

  const form = el("form", "www-form");
  form.innerHTML = `
    <div class="www-field">
      <label for="plan">申请档位</label>
      <select id="plan" name="plan"></select>
    </div>
    <div class="www-field">
      <label for="note">补充说明（可选）</label>
      <input id="note" name="note" type="text" maxlength="200" placeholder="设备数、使用场景、发票信息" />
    </div>
    <p class="www-error" hidden></p>
    <button class="www-btn www-btn-primary" type="submit">提交申请</button>`;

  for (const p of PLANS.filter((x) => x.plan !== "free" && x.plan !== plan)) {
    const opt = document.createElement("option");
    opt.value = p.plan;
    opt.textContent = `${p.label} · ${describe(p)}`;
    form.plan.append(opt);
  }

  const err = form.querySelector(".www-error");
  const btn = form.querySelector("button");
  form.onsubmit = async (e) => {
    e.preventDefault();
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "提交中…";
    try {
      await api("/license/request", {
        method: "POST",
        body: { plan: form.plan.value, note: form.note.value.trim() },
      });
      load();
    } catch (e2) {
      err.textContent = e2.message;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = "提交申请";
    }
  };

  box.append(form);
  return box;
}

/* ── 未登录 ─────────────────────────────────────────────── */

function renderAuth(mode) {
  titleEl.textContent = mode === "in" ? "登录" : "注册";
  leadEl.textContent =
    mode === "in"
      ? "登录后可以查看档位、已绑定的设备，以及申请升级。"
      : "注册即开通免费档：3 个环境、1 个同时运行，不需要付费。";

  panel.replaceChildren();

  const tabs = el("div", "www-switch u-mb-5");
  for (const [key, label] of [
    ["in", "登录"],
    ["up", "注册"],
  ]) {
    const b = el("button", null, label);
    b.type = "button";
    if (mode === key) b.dataset.active = "true";
    b.onclick = () => renderAuth(key);
    tabs.append(b);
  }
  panel.append(tabs);

  const form = el("form", "www-form");
  form.innerHTML = `
    <div class="www-field">
      <label for="email">邮箱</label>
      <input id="email" name="email" type="email" required autocomplete="email" placeholder="you@company.com" />
    </div>
    <div class="www-field">
      <label for="password">密码${mode === "up" ? "（至少 10 位）" : ""}</label>
      <input id="password" name="password" type="password" required minlength="${mode === "up" ? 10 : 1}"
        autocomplete="${mode === "up" ? "new-password" : "current-password"}" />
    </div>
    <p class="www-error" hidden></p>
    <button class="www-btn www-btn-primary" type="submit">${mode === "in" ? "登录" : "注册并开通免费档"}</button>`;

  const err = form.querySelector(".www-error");
  const btn = form.querySelector("button[type=submit]");
  const label = btn.textContent;
  form.onsubmit = async (e) => {
    e.preventDefault();
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "处理中…";
    try {
      await api(mode === "in" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: { email: form.email.value.trim().toLowerCase(), password: form.password.value },
      });
      load();
    } catch (e2) {
      err.textContent = e2.message;
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = label;
    }
  };

  panel.append(form);
}

function renderOffline(message) {
  titleEl.textContent = "账号服务暂时不可用";
  leadEl.textContent =
    "这不影响你已经装好的工作台：本机环境照常启动，额度按最近一次同步的档位执行。";
  panel.replaceChildren(el("p", "www-error u-mb-0", message));
  const actions = el("div", "www-actions");
  const retry = el("button", "www-btn www-btn-secondary", "重试");
  retry.type = "button";
  retry.onclick = load;
  actions.append(retry);
  panel.append(actions);
}

async function load() {
  try {
    if (!PLANS.length) PLANS = (await api("/plans")).plans;
    const state = await api("/auth/me");
    if (state.user) renderAccount(state);
    else renderAuth("in");
  } catch (e) {
    if (e.code === "UNAUTHENTICATED") renderAuth("in");
    else renderOffline(e.message);
  }
}

/* ── 联系表单（不需要登录） ─────────────────────────────── */

function wireContact() {
  const form = document.getElementById("contact-form");
  const err = document.getElementById("contact-error");
  const done = document.getElementById("contact-ok");
  const btn = form.querySelector("button[type=submit]");
  form.onsubmit = async (e) => {
    e.preventDefault();
    err.hidden = true;
    done.hidden = true;
    btn.disabled = true;
    btn.textContent = "提交中…";
    try {
      await api("/contact", {
        method: "POST",
        body: {
          topic: form.topic.value,
          email: form.email.value.trim().toLowerCase(),
          message: form.message.value.trim(),
        },
      });
      form.reset();
      done.hidden = false;
    } catch (e2) {
      err.textContent = e2.message;
      err.hidden = false;
    }
    btn.disabled = false;
    btn.textContent = "提交";
  };
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  wireContact();
});
