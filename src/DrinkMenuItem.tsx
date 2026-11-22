import { useState } from "react";
import { formatPrice, type DrinkOptions, type MenuDrink, type StoreProduct } from "./order";

const optionFields = [["ice", "冰度"], ["sugar", "糖度"]] as const;

type DrinkMenuItemProps = {
  drink: MenuDrink;
  toppings: StoreProduct[];
  locked: boolean;
  atQuantityLimit: boolean;
  onAdd: (options: DrinkOptions, toppingIds: string[]) => void;
};

export default function DrinkMenuItem({ drink, toppings, locked, atQuantityLimit, onAdd }: DrinkMenuItemProps) {
  const [options, setOptions] = useState<DrinkOptions>(() => ({
    ice: drink.options.ice.default,
    sugar: drink.options.sugar.default,
  }));
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const selectedToppings = toppings.filter((topping) => !topping.soldOut && toppingIds.includes(topping.productId));
  const priceCents = drink.priceCents + selectedToppings.reduce((sum, topping) => sum + topping.priceCents, 0);

  function toggleTopping(productId: string, checked: boolean) {
    setToppingIds((current) => checked
      ? [...current, productId]
      : current.filter((id) => id !== productId));
  }

  return (
    <li>
      <strong>{drink.name}</strong>
      <span>{formatPrice(priceCents)}</span>
      <fieldset className="drink-options" aria-label={`${drink.name}规格`} disabled={locked}>
        {optionFields.map(([option, label]) => (
          <label key={option}>
            {label}
            <select
              aria-label={`${drink.name} ${label}`}
              value={options[option]}
              onChange={(event) => setOptions({ ...options, [option]: event.target.value })}
            >
              {drink.options[option].choices.map((choice) => (
                <option key={choice} value={choice}>{choice}</option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
      {toppings.length > 0 && (
        <fieldset className="topping-options" disabled={locked}>
          <legend>每杯可加</legend>
          {toppings.map((topping) => (
            <label key={topping.productId}>
              <input
                type="checkbox"
                aria-label={`${drink.name} 加${topping.name}`}
                checked={!topping.soldOut && toppingIds.includes(topping.productId)}
                disabled={topping.soldOut}
                onChange={(event) => toggleTopping(topping.productId, event.target.checked)}
              />
              {topping.name} {topping.soldOut ? "（已下架）" : `+${formatPrice(topping.priceCents)}`}
            </label>
          ))}
        </fieldset>
      )}
      <button
        type="button"
        aria-label={`加入购物车：${drink.name}`}
        onClick={() => onAdd(options, selectedToppings.map((topping) => topping.productId))}
        disabled={locked || atQuantityLimit}
      >
        加入购物车
      </button>
    </li>
  );
}
