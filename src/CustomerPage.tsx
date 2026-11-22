import { useState } from "react";
import CustomerCheckout from "./CustomerCheckout";
import CustomerOrders from "./CustomerOrders";
import { useCustomerOrders } from "./useCustomerOrders";

export default function CustomerPage({ customerId, accessToken }: { customerId: string; accessToken?: string }) {
  const [submitting, setSubmitting] = useState(false);
  const { rememberOrder, refreshOrders, ...orderList } = useCustomerOrders(accessToken);

  return (
    <>
      <CustomerCheckout
        customerId={customerId}
        accessToken={accessToken}
        submitting={submitting}
        onSubmittingChange={setSubmitting}
        onOrderConfirmed={rememberOrder}
      />
      <CustomerOrders {...orderList} submitting={submitting} onRefresh={refreshOrders} />
    </>
  );
}
