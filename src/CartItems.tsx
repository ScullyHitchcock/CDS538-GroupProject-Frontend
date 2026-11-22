import { type CartItem } from "./cart";
import { productLineKey, productLineLabel, formatPrice, type ProductLine } from "./order";

type CartItemsProps = {
  items: CartItem[];
  locked: boolean;
  onQuantityChange: (line: ProductLine, change: 1 | -1) => void;
};

export default function CartItems({ items, locked, onQuantityChange }: CartItemsProps) {
  if (items.length === 0) return <p>购物车是空的</p>;

  return (
    <ul className="cart-items">
      {items.map((line) => {
        const label = productLineLabel(line);
        const unavailableToppings = line.unavailableToppings.map((topping) => topping.name).join("、");

        return (
          <li key={productLineKey(line)}>
            <span>
              {label}
              {line.soldOut && (unavailableToppings ? `（${unavailableToppings}已下架）` : "（已售罄）")}
            </span>
            <div className="quantity">
              <button
                type="button"
                aria-label={`减少${label}数量`}
                onClick={() => onQuantityChange(line, -1)}
                disabled={locked}
              >−</button>
              <span aria-label={`${label}数量`}>{line.quantity}</span>
              <button
                type="button"
                aria-label={`增加${label}数量`}
                onClick={() => onQuantityChange(line, 1)}
                disabled={locked || !line.canIncrease}
              >+</button>
            </div>
            <span>{formatPrice(line.priceCents * line.quantity)}</span>
          </li>
        );
      })}
    </ul>
  );
}
