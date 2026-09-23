import type { Metadata } from "next";
import Link from "next/link";
import { HashBlock } from "@/components/hash-block";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "下载与校验",
  description: "Enclave 安装包与内核的 SHA256 公示。先核对哈希，再安装。",
};

export default function Page() {
  return (
    <main className="www-main">
      <section className="www-hero www-hero-page">
        <h1>先核对哈希，再安装。</h1>
        <p className="www-lead">
          以下是安装包与内核的完整 SHA256 与字节数。下载后先在本机计算一遍再安装：
          这是一次无需依赖我们即可独立完成的验证。
        </p>
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>工作台安装包</h2>
          <p>版本 0.9.2</p>
        </div>
        <div className="www-table-wrap www-scroll">
          <table>
            <thead>
              <tr>
                <th>平台</th>
                <th>文件</th>
                <th>大小</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Windows x64</td>
                <td className="www-mono">
                  <a href="https://github.com/liangwenli1/enclave/releases/download/v0.9.2/Enclave_0.9.2_x64_en-US.msi">
                    Enclave_0.9.2_x64_en-US.msi
                  </a>
                </td>
                <td className="www-mono">7,122,944 字节</td>
                <td>
                  <span className="www-badge www-badge-warn">预览版</span>
                </td>
              </tr>
              <tr>
                <td>macOS Apple Silicon</td>
                <td className="www-mono">
                  <a href="https://github.com/liangwenli1/enclave/releases/download/v0.9.2/Enclave_0.9.2_aarch64.dmg">
                    Enclave_0.9.2_aarch64.dmg
                  </a>
                </td>
                <td className="www-mono">7,207,876 字节</td>
                <td>
                  <span className="www-badge www-badge-warn">预览版</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <HashBlock
          label={"Enclave_0.9.2_x64_en-US.msi，SHA256"}
          value={
            "6a7a888aa7d301c8415a9f4ddb14c64f9d8fe891cd08a3d91de87c9d1163126c"
          }
        />
        <HashBlock
          label={"Enclave_0.9.2_aarch64.dmg，SHA256"}
          value={
            "7b00f8ba371bbfeb4aac7c57b0b5c4080b5dde7f200205f8a9a141dee776a050"
          }
        />

        <div className="www-callout u-mt-4">
          两个安装包尚未附带代码签名。Windows 安装时会提示「未知发布者」；
          macOS 会提示应用「已损坏」，安装后请先在终端执行下方命令再打开。
          这正是需要核对哈希的原因：哈希一致，即可确认文件与我们发布的完全相同。
        </div>

        <div className="www-callout u-mt-4">
          0.9.2 是接入账号服务之前的版本：无法登录，按免费档使用（3
          个环境、同时运行 1 个）。自下一版本起，工作台需登录后使用。
        </div>

        <HashBlock
          label={"macOS：安装后执行一次"}
          value={"xattr -cr /Applications/Enclave.app"}
        />
        <HashBlock
          label={"在 Windows 上核对（PowerShell）"}
          value={
            "Get-FileHash .\\Enclave_0.9.2_x64_en-US.msi -Algorithm SHA256"
          }
        />
        <HashBlock
          label={"在 macOS 上核对（终端）"}
          value={"shasum -a 256 Enclave_0.9.2_aarch64.dmg"}
        />
      </section>

      <section className="www-section">
        <div className="www-section-head">
          <h2>内核 148.0.7778.215</h2>
          <p>安装包不含内核，首次使用时由工作台下载并校验</p>
        </div>
        <div className="www-table-wrap www-scroll">
          <table>
            <thead>
              <tr>
                <th>上游文件</th>
                <th>状态</th>
                <th>字节</th>
                <th>SHA256</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a href="https://github.com/adryfish/fingerprint-chromium/releases/download/148.0.7778.215/ungoogled-chromium_148.0.7778.215-1.1_windows_x64.zip">
                    ungoogled-chromium_148.0.7778.215-1.1_windows_x64.zip
                  </a>
                </td>
                <td>
                  <span className="www-badge www-badge-warn">预览</span>
                </td>
                <td className="www-mono">189,767,686</td>
                <td className="www-mono">
                  9ef3f471b7a6641b4224532522b29141ce3746e27d55788d88e2fd951f362579
                </td>
              </tr>
              <tr>
                <td>
                  <a href="https://github.com/adryfish/fingerprint-chromium/releases/download/148.0.7778.215/ungoogled-chromium_148.0.7778.215-1.1_macos.dmg">
                    ungoogled-chromium_148.0.7778.215-1.1_macos.dmg
                  </a>
                </td>
                <td>
                  <span className="www-badge www-badge-warn">预览</span>
                </td>
                <td className="www-mono">140,187,500</td>
                <td className="www-mono">
                  b72f091e2e1a7583eed389c4b8e3534ed355e568af8c8bbf8fc30a25e23ca679
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="www-note">
          工作台每次启动环境时，都会重新核对磁盘上实际执行的内核文件；哈希不符即拒绝启动，原因码为
          <code className="www-mono">KERNEL_HASH_MISMATCH</code>。
        </p>
      </section>

      <section className="www-cta">
        <h2>安装完成后，请先登录。</h2>
        <p>
          工作台需登录后使用。注册即开通免费档：3 个环境、同时运行 1
          个，无需付费。
        </p>
        <div className="www-actions">
          <Link className={buttonVariants({ size: "lg" })} href="/account">
            注册账号
          </Link>
        </div>
      </section>
    </main>
  );
}
