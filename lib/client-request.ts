/** Never automatically replay writes after a timeout: the commit may have succeeded. */
export async function requestJson(url: string, init: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: init.signal || AbortSignal.timeout(30000) });
  } catch {
    throw new Error(init.method && init.method !== 'GET'
      ? '网络中断，暂无法确认提交结果。请恢复网络后核对记录，再决定是否重试。'
      : '连接暂不可用，请检查网络后重试。');
  }
  let data: any;
  try { data = await res.json(); }
  catch { throw new Error('服务暂不可用，请稍后重试。'); }
  if (!res.ok) throw new Error(data.error || '请求失败，请稍后重试。');
  return data;
}
