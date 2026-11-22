import { useState } from "react";
import CustomerCheckout from "./CustomerCheckout";
import CustomerOrders from "./CustomerOrders";
import { useCustomerOrders } from "./useCustomerOrders";
import "./customer.css";

type CustomerPageProps = {
  customerId: string;
  accessToken?: string;
};

export default function CustomerPage({ customerId, accessToken }: CustomerPageProps) {
  const [submitting, setSubmitting] = useState(false);
  const { rememberOrder, refreshOrders, ...orderList } = useCustomerOrders(accessToken);

  return (
    <div className="customer-page">
      <CustomerCheckout
        customerId={customerId}
        accessToken={accessToken}
        submitting={submitting}
        onSubmittingChange={setSubmitting}
        onOrderConfirmed={rememberOrder}
      />
      <CustomerOrders {...orderList} submitting={submitting} onRefresh={refreshOrders} />
    </div>
  );
}
