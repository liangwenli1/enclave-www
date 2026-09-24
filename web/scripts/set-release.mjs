#!/usr/bin/env node
/*
 * 把 GitHub Release 上的安装包登记到下载页（lib/release.json）。哈希不手抄。
 *
 *   gh release view v0.10.4 -R liangwenli1/enclave --json tagName,publishedAt,body | node scripts/set-release.mjs
 *
 * 读的是 release.yml 写进 Release 说明的那几行：
 *   - `Enclave_0.10.4_x64_zh-CN.msi` · SHA256 `<64 位>` · <字节数> 字节
 * 只登记用正式域名打的包——没有域名的包装上去登录不了，不该出现在下载页。
 */
import { readFileSync, writeFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const line = /`([^`]+\.(msi|dmg))`\s*·\s*SHA256\s*`([0-9a-f]{64})`\s*·\s*(\d+)\s*字节/g;

const files = [...String(input.body ?? "").matchAll(line)].map((m) => ({
  platform: m[2] === "msi" ? "windows" : "macos",
  name: m[1],
  bytes: Number(m[4]),
  sha256: m[3],
}));
if (files.length === 0) {
  console.error("Release 说明里没有找到安装包那几行。先等 release.yml 跑完。");
  process.exit(1);
}

const version = String(input.tagName).replace(/^v/, "");
// 草稿还没有发布时间，用今天。
const date = String(input.publishedAt || new Date().toISOString()).slice(0, 10);
const out = new URL("../lib/release.json", import.meta.url);
writeFileSync(out, `${JSON.stringify({ version, date, files }, null, 2)}\n`);
console.log(`已登记 ${version}（${date}）：${files.map((f) => f.name).join("、")}`);
