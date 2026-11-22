import { drinkLineKey, drinkLineLabel, formatPrice, type Order } from "./order";

export default function OrderItems({ items, totalAmountCents }: Pick<Order, "items" | "totalAmountCents">) {
  if (!items?.length) return <>—</>;

  return (
    <>
      <ul className="order-items">
        {items.map((item) => (
          <li key={drinkLineKey(item)}>{drinkLineLabel(item)} × {item.quantity} · {formatPrice(item.unitPriceCents)}/杯</li>
        ))}
      </ul>
      {totalAmountCents !== undefined && <strong>合计 {formatPrice(totalAmountCents)}</strong>}
    </>
  );
}
