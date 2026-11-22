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
    <section>
      <h3>我的订单</h3>
      <button onClick={onRefresh} disabled={loading || submitting}>
        {loading ? "正在读取…" : hasLoaded ? "刷新我的订单" : "查看我的订单"}
      </button>
      {error && <p role="alert">{error}</p>}
      {hasLoaded && orders.length === 0 && <p>暂无订单</p>}
      {orders.length > 0 && (
        <table style={{ margin: "12px auto" }}>
          <thead>
            <tr>
              <th scope="col">下单时间</th>
              <th scope="col">饮品</th>
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
      )}
    </section>
  );
}
