/** 更新日志：按大版本写，只列用户看得到的变化。新版本加在最前面。 */
export type Entry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

export const CHANGELOG: Entry[] = [
  {
    version: "0.10",
    date: "2026-09-24",
    title: "团队、加密同步、批量执行与自动化",
    items: [
      "团队：成员分为所有者、管理员与操作员，环境按文件夹授权；移出成员后，相关环境自动更换密钥。",
      "加密同步：环境、代理与登录态在本机加密后上传，换一台电脑启动，仍是登录状态。",
      "Firefox 类内核：成套的真机设备画像，与 Chromium 类并列可选。",
      "批量执行：一次启动、停止一批环境或运行流程，同一代理出口自动错开。",
      "自动化：十种步骤拼成流程，无需编写代码，两类内核通用。",
      "地理位置跟随代理出口，也可手动填写或禁用；新开的标签页同样生效。",
    ],
  },
  {
    version: "0.9",
    date: "2026-09-21",
    title: "首个预览版",
    items: [
      "Windows 10 / 11 与 macOS（Apple Silicon）安装包。",
      "多个内核版本并存，每个环境绑定一个版本，升级互不影响。",
      "支持带账号密码的代理；代理不通时不启动，时区与语言跟随出口。",
      "成套指纹预设：平台、语言、CPU 核数按真实组合生成。",
      "本机 API：脚本可列出、启动与停止环境。",
    ],
  },
];

export const CHANGELOG_EN: Entry[] = [
  {
    version: "0.10",
    date: "2026-09-24",
    title: "Teams, encrypted sync, batch actions, and automation",
    items: [
      "Team roles for owners, administrators, and operators, with environment access granted by folder and key rotation after member removal.",
      "On-device encryption for environment, proxy, and session sync, so approved devices can resume signed-in sessions.",
      "Firefox-based engines with coherent real-device profiles alongside Chromium-based engines.",
      "Batch start, stop, and workflow execution with automatic staggering for environments that share a proxy exit.",
      "No-code automation workflows built from ten reusable steps across both engine families.",
      "Geolocation can follow the proxy exit, use a custom value, or remain disabled, including in new tabs.",
    ],
  },
  {
    version: "0.9",
    date: "2026-09-21",
    title: "Initial preview",
    items: [
      "Installers for Windows 10/11 and macOS on Apple silicon.",
      "Multiple engine versions installed side by side, with each environment pinned independently.",
      "Authenticated proxy support with fail-closed startup and locale signals matched to the exit.",
      "Coherent fingerprint presets for platform, language, and CPU combinations.",
      "A local API for listing, starting, and stopping environments from scripts.",
    ],
  },
];
