import { GoogleAuthProvider } from 'firebase/auth';

/**
 * Fornecedor do Google que SEMPRE mostra a lista de contas.
 * Sem isto, quem tem várias contas Google no navegador entra logo na primeira (ou na última usada),
 * sem poder escolher outra.
 */
export function googleProvider(loginHint?: string | null): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account',
        ...(loginHint ? { login_hint: loginHint } : {}),
    });
    return provider;
}
