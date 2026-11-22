import OrderItems from "./OrderItems";
import { formatOrderTime, orderStatusLabel, type Order } from "./order";

type CustomerOrdersProps = {
  orders: Order[];
  hasLoaded: boolean;
  loading: boolean;
  error: string;
  submitting: boolean;
  onRefresh: () => void;
};

export default function CustomerOrders({
  orders,
  hasLoaded,
  loading,
  error,
  submitting,
  onRefresh,
}: CustomerOrdersProps) {
  return (
    <section className="customer-orders" id="customer-orders" tabIndex={-1} aria-labelledby="orders-heading">
      <div className="menu-section-heading">
        <h2 id="orders-heading">我的订单</h2>
        <button className="menu-button menu-button--outline" type="button" onClick={onRefresh} disabled={loading || submitting}>
          {loading ? "正在读取…" : hasLoaded ? "刷新我的订单" : "查看我的订单"}
        </button>
      </div>
      {error && <p role="alert" className="checkout-alert">{error}</p>}
      {hasLoaded && orders.length === 0 && <p className="cart-empty">暂无订单</p>}
      {orders.length > 0 && (
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th scope="col">下单时间</th>
                <th scope="col">商品</th>
                <th scope="col">备注</th>
                <th scope="col">状态</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td>{formatOrderTime(order.createdAt)}</td>
                  <td><OrderItems items={order.items} totalAmountCents={order.totalAmountCents} /></td>
                  <td>{order.note || "—"}</td>
                  <td>{orderStatusLabel(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
