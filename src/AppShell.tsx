import { type ReactNode } from "react";

export type PageLink = { href: string; label: string };

type AppShellProps = {
  navigation?: PageLink[];
  account?: { username?: string; onLogout: () => void };
  children: ReactNode;
};

export default function AppShell({ navigation = [], account, children }: AppShellProps) {
  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <a className="app-brand" href={navigation[0]?.href ?? "/"}>点单系统</a>
          {navigation.length > 0 && (
            <nav aria-label="点单导航">
              {navigation.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
            </nav>
          )}
          {account && (
            <div className="app-account">
              {account.username && <span title={account.username}>{account.username}</span>}
              <button className="app-button app-button--outline" type="button" onClick={account.onLogout}>
                退出登录
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="app-content">{children}</main>
    </>
  );
}
