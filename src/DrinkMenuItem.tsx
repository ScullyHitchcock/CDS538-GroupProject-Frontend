import { useState } from "react";
import { formatPrice, type DrinkOptions, type MenuDrink } from "./order";

const optionFields = [["ice", "冰度"], ["sugar", "糖度"]] as const;

type DrinkMenuItemProps = {
  drink: MenuDrink;
  locked: boolean;
  atQuantityLimit: boolean;
  onAdd: (options: DrinkOptions) => void;
};

export default function DrinkMenuItem({ drink, locked, atQuantityLimit, onAdd }: DrinkMenuItemProps) {
  const [options, setOptions] = useState<DrinkOptions>(() => ({
    ice: drink.options.ice.default,
    sugar: drink.options.sugar.default,
  }));

  return (
    <li>
      <strong>{drink.name}</strong>
      <span>{formatPrice(drink.priceCents)}</span>
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
      <button
        type="button"
        aria-label={`加入购物车：${drink.name}`}
        onClick={() => onAdd(options)}
        disabled={locked || atQuantityLimit}
      >
        加入购物车
      </button>
    </li>
  );
}
