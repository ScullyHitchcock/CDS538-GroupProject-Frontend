import { productLineKey, productLineLabel, formatPrice, type Order } from "./order";

export default function OrderItems({ items, totalAmountCents }: Pick<Order, "items" | "totalAmountCents">) {
  if (!items?.length) return <>—</>;

  return (
    <>
      <ul className="order-items">
        {items.map((item) => (
          <li key={productLineKey({ ...item, toppingIds: item.toppings?.map((topping) => topping.productId) })}>
            {productLineLabel(item)} × {item.quantity} · {formatPrice(item.unitPriceCents)}/{item.unit === "portion" ? "份" : "杯"}
          </li>
        ))}
      </ul>
      {totalAmountCents !== undefined && <strong>合计 {formatPrice(totalAmountCents)}</strong>}
    </>
  );
}
