/** Chama uma rota da app com o token da sessão e devolve o JSON (ou lança Error com a mensagem do servidor). */
export async function authedFetch(url: string, method: string, body: Record<string, unknown>) {
    const { getAuth } = await import('firebase/auth');
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error('Sessão expirada. Entre de novo.');
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
    return json;
}
