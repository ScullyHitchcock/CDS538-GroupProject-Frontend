import DrinkMenuItem from "./DrinkMenuItem";
import { type MenuDrink, type ProductLine, type StoreProduct } from "./order";
import ProductCard from "./ProductCard";

type CustomerMenuProps = {
  drinks: MenuDrink[];
  toppings: StoreProduct[];
  locked: boolean;
  atQuantityLimit: (productId: string) => boolean;
  onAdd: (line: ProductLine) => void;
};

export default function CustomerMenu({ drinks, toppings, locked, atQuantityLimit, onAdd }: CustomerMenuProps) {
  return (
    <>
      {drinks.length === 0 && <p className="menu-message">暂无可售饮品</p>}
      {drinks.length > 0 && (
        <ul className="product-grid">
          {drinks.map((drink) => (
            <DrinkMenuItem
              key={drink.productId}
              drink={drink}
              toppings={toppings}
              locked={locked}
              atQuantityLimit={atQuantityLimit(drink.productId)}
              onAdd={(options, toppingIds) => onAdd({
                productId: drink.productId,
                options,
                toppingIds: toppingIds.length ? toppingIds : undefined,
              })}
            />
          ))}
        </ul>
      )}
      {toppings.length > 0 && (
        <div className="menu-toppings">
          <h3>单点小料</h3>
          <ul className="product-grid topping-grid">
            {toppings.map((topping) => (
              <ProductCard key={topping.productId} product={topping} priceCents={topping.priceCents} perPortion>
                <button
                  className="menu-button"
                  type="button"
                  aria-label={`单点${topping.name}`}
                  onClick={() => onAdd({ productId: topping.productId })}
                  disabled={locked || topping.soldOut || atQuantityLimit(topping.productId)}
                >
                  {topping.soldOut ? "已下架" : "加入购物车"}
                </button>
              </ProductCard>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
