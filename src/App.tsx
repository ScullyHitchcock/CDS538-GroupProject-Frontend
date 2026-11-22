import { useAuth } from "react-oidc-context";
import CustomerPage from "./CustomerPage";
import MerchantPage from "./MerchantPage";

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

  if (auth.isLoading) {
    return <p>正在处理登录……</p>;
  }

  if (auth.error) {
    return (
      <div style={{ padding: 24 }}>
        <p>登录失败：{auth.error.message}</p>
        <a href="/">返回首页重试</a>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div style={{ padding: 24 }}>
        <h2>点单系统</h2>
        <button onClick={() => auth.signinRedirect()}>登录</button>
      </div>
    );
  }

  const profile = auth.user!.profile;
  const username = String(profile["cognito:username"] ?? profile.sub);
  const groups = profile["cognito:groups"];
  const isCustomer = Array.isArray(groups) && groups.includes("customers");
  const isMerchant = Array.isArray(groups) && groups.includes("merchants");

  return (
    <div style={{ padding: 24 }}>
      <h2>点单系统</h2>
      <p>当前用户：{username}</p>
      <p>所属组：{Array.isArray(groups) ? groups.join(", ") : "尚未分组"}</p>
      <button onClick={logout}>退出登录</button>
      <hr />

      {isCustomer && <CustomerPage key={profile.sub} accessToken={auth.user!.access_token} />}
      {isMerchant && <MerchantPage key={profile.sub} accessToken={auth.user!.access_token} />}
    </div>
  );
}
