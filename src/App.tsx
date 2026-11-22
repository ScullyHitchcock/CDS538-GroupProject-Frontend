import { useAuth } from "react-oidc-context";
import AccessPage from "./AccessPage";
import AppShell, { type PageLink } from "./AppShell";
import CustomerPage from "./CustomerPage";
import MerchantPage from "./MerchantPage";

const customerLinks: PageLink[] = [
  { href: "#customer-menu", label: "菜单" },
  { href: "#customer-cart", label: "购物车" },
  { href: "#customer-orders", label: "我的订单" },
];

const merchantLinks: PageLink[] = [
  { href: "#merchant-orders", label: "待处理订单" },
  { href: "#merchant-menu", label: "供应状态" },
];

export default function App() {
  const auth = useAuth();

  async function logout() {
    auth.stopSilentRenew();
    await auth.removeUser();

    const params = new URLSearchParams({
      client_id: "3t3adrt52kojkp8svtmh7k729p",
      logout_uri: `${window.location.origin}/`,
    });

    window.location.href =
      `https://us-east-1xatvqnru6.auth.us-east-1.amazoncognito.com/logout?${params}`;
  }

  if (auth.isLoading) return <AppShell><AccessPage state="loading" /></AppShell>;
  if (auth.error) return <AppShell><AccessPage state="error" message={auth.error.message} /></AppShell>;
  if (!auth.isAuthenticated) {
    return <AppShell><AccessPage state="sign-in" onSignIn={() => void auth.signinRedirect()} /></AppShell>;
  }

  const { profile, access_token: accessToken } = auth.user!;
  const username = String(profile["cognito:username"] ?? profile.sub);
  const groups = profile["cognito:groups"];
  const isCustomer = Array.isArray(groups) && groups.includes("customers");
  const isMerchant = Array.isArray(groups) && groups.includes("merchants");
  const navigation = [
    ...(isCustomer ? customerLinks : []),
    ...(isMerchant ? merchantLinks : []),
  ];

  return (
    <AppShell navigation={navigation} account={{ username: isMerchant ? undefined : username, onLogout: logout }}>
      {isCustomer && <CustomerPage key={`customer:${profile.sub}`} customerId={profile.sub} accessToken={accessToken} />}
      {isMerchant && <MerchantPage key={`merchant:${profile.sub}`} accessToken={accessToken} storeName={username} secondary={isCustomer} />}
      {!isCustomer && !isMerchant && <AccessPage state="unassigned" username={username} />}
    </AppShell>
  );
}
