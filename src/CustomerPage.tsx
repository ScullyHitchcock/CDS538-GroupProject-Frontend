import { useState } from "react";
import CustomerCheckout from "./CustomerCheckout";
import CustomerOrders from "./CustomerOrders";
import { useCustomerOrders } from "./useCustomerOrders";
import "./customer.css";

type CustomerPageProps = {
  customerId: string;
  accessToken?: string;
  username: string;
  onLogout: () => void;
};

export default function CustomerPage({ customerId, accessToken, username, onLogout }: CustomerPageProps) {
  const [submitting, setSubmitting] = useState(false);
  const { rememberOrder, refreshOrders, ...orderList } = useCustomerOrders(accessToken);

  return (
    <div className="customer-shell">
      <header className="customer-header">
        <div className="customer-header-inner">
          <a className="customer-brand" href="#customer-menu">点单系统</a>
          <nav aria-label="点单导航">
            <a href="#customer-menu">菜单</a>
            <a href="#customer-cart">购物车</a>
            <a href="#customer-orders">我的订单</a>
          </nav>
          <div className="customer-account">
            <span title={username}>{username}</span>
            <button className="menu-button menu-button--outline" type="button" onClick={onLogout}>
              退出登录
            </button>
          </div>
        </div>
      </header>
      <main className="customer-page">
        <CustomerCheckout
          customerId={customerId}
          accessToken={accessToken}
          submitting={submitting}
          onSubmittingChange={setSubmitting}
          onOrderConfirmed={rememberOrder}
        />
        <CustomerOrders {...orderList} submitting={submitting} onRefresh={refreshOrders} />
      </main>
    </div>
  );
}
