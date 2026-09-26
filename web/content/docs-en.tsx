import type { Doc } from "@/content/docs";
import { LocaleLink as Link } from "@/components/locale-link";
import type { ReactNode } from "react";

const Note = ({ children }: { children: ReactNode }) => (
  <div className="rounded-xl border border-border bg-muted px-4 py-3 text-[15px] leading-relaxed">{children}</div>
);

export const DOCS_EN: Doc[] = [
  {
    slug: "install", group: "Getting started", title: "Install and sign in", summary: "Install Enclave, verify the download, and authorize the workspace in your browser.",
    body: <><p>Enclave combines a local workspace with an online account service. Browser processes and environment data remain on this computer.</p><h2>Install</h2><p>Download the installer for Windows or macOS, compare its SHA256 checksum with the value on the download page, and complete installation.</p><h2>Sign in</h2><p>Select <strong>Sign in</strong> in the workspace. Enclave opens the account page in the default browser. Complete authentication and approve the device request.</p><Note>Passwords are entered only on the website. The workspace receives a short-lived authorization code, not the account password.</Note></>,
  },
  {
    slug: "first-environment", group: "Getting started", title: "Create the first environment", summary: "Choose the browser configuration, proxy, region, and engine version, then launch.",
    body: <><p>Select <strong>New environment</strong> from the Environments page.</p><h2>Basic information</h2><p>Enter a clear name and choose a folder. Folders control which team members can access the environment.</p><h2>Network and region</h2><p>Select a proxy when required. Enclave can align timezone and browser language with the proxy exit. Choose a downloaded engine version, then create and launch the environment.</p></>,
  },
  {
    slug: "fingerprint", group: "Environments", title: "Fingerprints and browser engines", summary: "Understand what Chromium and Firefox environments can control.",
    body: <><p>Each environment has independent browser state, including cookies, cache, and supported fingerprint settings.</p><h2>Chromium family</h2><p>Uses the host operating system for system fonts and several platform signals. This provides strong site compatibility.</p><h2>Firefox family</h2><p>Supports complete platform profiles for Windows, macOS, and Linux. Use it when the profile must differ from the host system.</p><p>See the <Link href="/check">fingerprint check</Link> for the verified capability matrix.</p></>,
  },
  {
    slug: "proxy", group: "Environments", title: "Proxies and exit alignment", summary: "Bind a proxy and keep network, timezone, language, and location consistent.",
    body: <><p>Add HTTP, HTTPS, or SOCKS proxies from the Proxy page. Credentials are encrypted by the local service.</p><h2>Exit alignment</h2><p>When enabled, Enclave detects the proxy exit country before launch and aligns timezone and language. If the exit cannot be identified, the configured fallback region is used.</p><Note>An authenticated proxy that cannot connect blocks launch instead of falling back to the direct connection.</Note></>,
  },
  {
    slug: "kernels", group: "Environments", title: "Engine versions", summary: "Download, verify, select, and remove browser engine versions.",
    body: <><p>Engine versions are managed separately from the workspace app. Multiple versions can remain installed at the same time.</p><h2>Integrity checks</h2><p>Downloads are verified against the signed manifest. The executable is checked again before every launch.</p><h2>Updates</h2><p>Existing environments remain on their selected version until the version is changed explicitly.</p></>,
  },
  {
    slug: "export", group: "Environments", title: "Export and import", summary: "Move environments between computers without including browsing history.",
    body: <><p>Environment packages include configuration, proxies, and search-engine definitions. Cookies, cache, and browsing history are excluded.</p><p>Set an export passphrase to include encrypted proxy passwords. Without a passphrase, no passwords are written to the file.</p></>,
  },
  {
    slug: "batch", group: "Efficiency", title: "Batch actions", summary: "Start, stop, or run workflows across a selected set of environments.",
    body: <><p>Select environments from the list and open Batch actions. Configure concurrency and optional retries.</p><p>Capacity limits queue automatically. Environments sharing a proxy exit are started in sequence to avoid simultaneous login bursts.</p></>,
  },
  {
    slug: "automation", group: "Efficiency", title: "Automation workflows", summary: "Build reusable browser workflows without writing code.",
    body: <><p>Workflows support navigation, clicks, input, waits, scrolling, text extraction, conditions, and loops.</p><h2>Variables</h2><p>Extracted text can be stored in a variable and referenced by later steps.</p><h2>Failure handling</h2><p>Each step can retry, skip, or stop the workflow. Runs execute locally inside the selected environments.</p></>,
  },
  {
    slug: "sync", group: "Teams", title: "Encrypted sync", summary: "Synchronize environments and login state between authorized devices.",
    body: <><p>Sync is available on paid plans. Environment configuration, proxy credentials, and login state are encrypted on the source device before upload.</p><h2>Adding a device</h2><p>An existing authorized device confirms the new device and verifies a six-digit code before transferring the encryption key.</p><Note>The server stores ciphertext and cannot decrypt synchronized content.</Note></>,
  },
  {
    slug: "team", group: "Teams", title: "Teams and permissions", summary: "Assign environment folders to owners, administrators, and operators.",
    body: <><p>Owners manage billing and membership. Administrators manage team environments. Operators can use only folders assigned to them.</p><p>Operators cannot view proxy passwords or export environment packages. New environments inherit the permissions of their folder.</p></>,
  },
  {
    slug: "activity", group: "Teams", title: "Activity log", summary: "Review security-sensitive actions across members and devices.",
    body: <><p>The activity log records actions such as sign-in, environment launch, permission changes, imports, and security-setting changes.</p><p>Team owners and administrators can review server-side records. Local diagnostic events remain available in the workspace.</p></>,
  },
  {
    slug: "api", group: "Advanced", title: "Local API", summary: "Discover, start, and stop environments from local scripts.",
    body: <><p>The local API is disabled by default and listens only on the local interface. Requests require a dedicated token.</p><p>API capabilities depend on the current plan. Rotate the token immediately if it may have been exposed.</p></>,
  },
  {
    slug: "account", group: "Account", title: "Account, devices, and plans", summary: "Manage plan capacity, authorized devices, members, and billing.",
    body: <><p>The account page shows the active plan, environment usage, authorized devices, and team membership.</p><p>Remove a device before moving to another computer when the plan limits device count. Plan details are available on the <Link href="/pricing">pricing page</Link>.</p></>,
  },
];

export const GROUPS_EN = [...new Set(DOCS_EN.map((doc) => doc.group))];

export function docBySlugEn(slug: string) {
  return DOCS_EN.find((doc) => doc.slug === slug);
}
