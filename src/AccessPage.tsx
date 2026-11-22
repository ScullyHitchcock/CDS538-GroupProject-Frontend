import { type ReactNode } from "react";
import ProductImage from "./ProductImage";
import "./access.css";

type AccessPageProps =
  | { state: "sign-in"; onSignIn: () => void }
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "unassigned"; username: string };

function AccessNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="access-notice" aria-labelledby="access-heading">
      <h1 id="access-heading">{title}</h1>
      {children}
    </section>
  );
}

export default function AccessPage(props: AccessPageProps) {
  switch (props.state) {
    case "sign-in":
      return (
        <section className="sign-in-panel" aria-labelledby="access-heading">
          <div className="sign-in-intro">
            <h1 id="access-heading">登录点单系统</h1>
            <p>查看门店菜单、下单，或处理本店订单。</p>
            <button className="app-button" type="button" onClick={props.onSignIn}>登录</button>
          </div>
          <div className="sign-in-photos" aria-hidden="true">
            <ProductImage productId="pearl-milk-tea" />
            <ProductImage productId="jasmine-milk-tea" />
            <ProductImage productId="lemon-tea" />
          </div>
        </section>
      );
    case "loading":
      return (
        <AccessNotice title="正在处理登录">
          <p role="status">正在验证登录状态…</p>
        </AccessNotice>
      );
    case "error":
      return (
        <AccessNotice title="登录失败">
          <p className="app-alert" role="alert">{props.message}</p>
          <a className="app-button app-button--outline" href="/">返回首页重试</a>
        </AccessNotice>
      );
    case "unassigned":
      return (
        <AccessNotice title="账号尚未分组">
          <p>当前账号为 <strong>{props.username}</strong>。请联系管理员分配顾客或商家权限。</p>
        </AccessNotice>
      );
  }
}
