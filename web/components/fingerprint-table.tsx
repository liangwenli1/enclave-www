import { cn } from "cn";

/*
 * 指纹清单：只写在真实内核上实测过的。「跟随本机」是这类内核本身改不了的项，
 * 「尚未实测」在测过之前不打勾。首页和指纹检测页共用这一张。
 */

type Cell = { text: string; ok?: boolean; note?: string };
const yes = (text: string, note?: string): Cell => ({ text, ok: true, note });
const host = (text: string, note?: string): Cell => ({ text, note });

export const FINGERPRINT_ROWS: [string, Cell, Cell][] = [
  ["User-Agent 与 Client Hints", yes("按环境设置"), yes("按环境设置")],
  ["时区 · 语言 · 日期数字格式", yes("跟随代理出口"), yes("跟随代理出口")],
  ["地理位置", yes("跟随出口 / 自填 / 禁用"), yes("跟随出口 / 自填 / 禁用")],
  ["WebRTC", yes("只走代理"), yes("只走代理")],
  ["Canvas", yes("加噪声或真实，可选"), host("真实", "与普通 Firefox 用户一致")],
  ["CPU 核数", yes("按环境设置"), yes("按环境设置")],
  ["操作系统平台", host("跟随本机"), yes("Windows / macOS / Linux 可选")],
  ["字体", host("跟随本机"), yes("按平台成套")],
  ["屏幕分辨率 · 缩放", host("跟随本机", "窗口大小可设"), yes("成套真机设备")],
  ["WebGL 厂商与渲染器", host("尚未实测"), yes("按环境设置")],
  ["navigator.webdriver", yes("始终为 false"), yes("始终为 false")],
];

function Td({ cell }: { cell: Cell }) {
  return (
    <td className={cn(cell.ok ? "font-medium text-ok" : "text-muted-foreground")}>
      {cell.text}
      {cell.note ? <span className="block text-[12.5px] font-normal text-muted-foreground">{cell.note}</span> : null}
    </td>
  );
}

export function FingerprintTable() {
  return (
    <div className="table-scroll rounded-xl border border-border bg-card">
      <table className="data-table min-w-[620px]">
        <thead>
          <tr>
            <th scope="col">项目</th>
            <th scope="col">Chromium 类</th>
            <th scope="col">Firefox 类</th>
          </tr>
        </thead>
        <tbody>
          {FINGERPRINT_ROWS.map(([name, chromium, firefox]) => (
            <tr key={name}>
              <th scope="row" className="bg-transparent text-[14.5px] font-medium whitespace-normal text-foreground">
                {name}
              </th>
              <Td cell={chromium} />
              <Td cell={firefox} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
