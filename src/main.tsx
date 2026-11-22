import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import './index.css'
import App from './App.tsx'

const cognitoConfig = {
    authority:
        'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XaTvqnru6',
    client_id: '3t3adrt52kojkp8svtmh7k729p',
    redirect_uri: `${window.location.origin}/`,
    response_type: 'code',
    scope: 'openid email',

    // 登录结果处理完成后，清理地址栏中的授权码等参数。
    onSigninCallback: () => {
        window.history.replaceState({}, document.title, window.location.pathname)
    },
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider {...cognitoConfig}>
            <App />
        </AuthProvider>
    </StrictMode>,
)
