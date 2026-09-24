import data from "./release.json";
import { SITE } from "./site";

/*
 * 下载页展示的安装包。只在 release.json 一处，由 scripts/set-release.mjs 从 GitHub Release 的说明里生成，
 * 不手抄哈希。version 为 null 时，下载页显示「即将开放下载」，不给任何链接。
 */

export type Platform = "windows" | "macos";

export type ReleaseFile = {
  platform: Platform;
  name: string;
  bytes: number;
  sha256: string;
};

export type Release = { version: string; date: string; files: ReleaseFile[] };

// JSON 里没登记时 version 是 null；登记后三项都有。
const raw = data as { version: string | null; date: string | null; files: ReleaseFile[] };

export const RELEASE: Release | null =
  raw.version && raw.date ? { version: raw.version, date: raw.date, files: raw.files } : null;

export const fileFor = (release: Release | null, platform: Platform) =>
  release?.files.find((f) => f.platform === platform) ?? null;

export const downloadUrl = (release: Release, file: ReleaseFile) =>
  `${SITE.repo}/releases/download/v${release.version}/${encodeURIComponent(file.name)}`;

export const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
