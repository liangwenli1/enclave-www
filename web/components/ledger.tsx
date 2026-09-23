import { Glyph } from "@/components/glyph";

/* 首屏的示例表：同一台电脑开了几个环境之后，网站分别看到的是什么。数据是示例。 */
const ROWS = [
  {
    real: true,
    seed: 1,
    name: "这台电脑本来的样子",
    note: "不开环境时",
    os: "Windows 11，Chrome 148",
    tz: "Asia/Shanghai",
    ip: "真实 IP",
    screen: "1920 × 1080",
    canvas: "a91f…07c2",
  },
  {
    seed: 3744107901,
    name: "shop-us-03",
    note: "美国店铺",
    os: "Windows 11，Chrome 148",
    tz: "America/Los_Angeles",
    ip: "104.28.…（洛杉矶）",
    screen: "2560 × 1440",
    canvas: "3e7b…d410",
  },
  {
    seed: 918273645,
    name: "ads-de-01",
    note: "德国广告账户",
    os: "macOS 15，Chrome 148",
    tz: "Europe/Berlin",
    ip: "85.214.…（柏林）",
    screen: "1512 × 982",
    canvas: "c02a…9f6e",
  },
  {
    seed: 5550123,
    name: "social-jp-12",
    note: "日本社媒",
    os: "Windows 10，Edge 148",
    tz: "Asia/Tokyo",
    ip: "133.130.…（东京）",
    screen: "1920 × 1080",
    canvas: "77d1…2b83",
  },
  {
    seed: 42424242,
    name: "store-br-02",
    note: "巴西店铺",
    os: "Windows 11，Chrome 148",
    tz: "America/Sao_Paulo",
    ip: "177.71.…（圣保罗）",
    screen: "1680 × 1050",
    canvas: "e5a9…6c17",
  },
];

export function Ledger() {
  return (
    <section className="www-ledger">
      <div className="www-ledger-cap">
        <b>同一台电脑，此刻在网站眼里是五台不同的设备</b>
        <span>示例数据</span>
      </div>
      <div className="www-scroll">
        <table>
          <thead>
            <tr>
              <th>设备</th>
              <th>系统与浏览器</th>
              <th>时区</th>
              <th>出口 IP</th>
              <th>屏幕</th>
              <th>Canvas 指纹</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((x) => (
              <tr key={x.name} className={x.real ? "is-real" : undefined}>
                <td>
                  <div className="www-id">
                    <Glyph seed={x.seed} />
                    <div>
                      <b>{x.name}</b>
                      <small>{x.note}</small>
                    </div>
                  </div>
                </td>
                <td>{x.os}</td>
                <td>{x.tz}</td>
                <td>{x.ip}</td>
                <td>{x.screen}</td>
                <td className="www-mono">{x.canvas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
