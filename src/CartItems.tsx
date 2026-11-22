import { type CartItem } from "./cart";
import { drinkLineKey, drinkLineLabel, formatPrice, type DrinkLine } from "./order";

type CartItemsProps = {
  items: CartItem[];
  locked: boolean;
  onQuantityChange: (line: DrinkLine, change: 1 | -1) => void;
};

export default function CartItems({ items, locked, onQuantityChange }: CartItemsProps) {
  if (items.length === 0) return <p>购物车是空的</p>;

  return (
    <ul className="cart-items">
      {items.map((line) => {
        const label = drinkLineLabel(line);

        return (
          <li key={drinkLineKey(line)}>
            <span>{label}{line.soldOut && "（已售罄）"}</span>
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
