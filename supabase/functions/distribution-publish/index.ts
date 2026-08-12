import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/insightDb.ts';
import { requireAdminCaller } from '../_shared/adminAuth.ts';

type Platform = 'x' | 'reddit' | 'youtube' | 'tiktok' | 'weibo' | 'xiaohongshu';

interface PublishResult {
  externalId: string;
  externalUrl: string;
}

interface PostRow {
  id: string;
  platform: Platform;
  title: string | null;
  body: string;
  account_id: string | null;
  status: string;
}

interface AccountRow {
  id: string;
  platform: Platform;
  credentials: Record<string, string> | null;
}

// =============================================
// OAuth 1.0a (X / Twitter) 서명
// =============================================

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function buildOAuth1Header(opts: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: opts.consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: opts.accessToken,
    oauth_version: '1.0',
  };

  const paramString = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`)
    .join('&');
  const baseString = [opts.method.toUpperCase(), percentEncode(opts.url), percentEncode(paramString)].join(
    '&'
  );
  const signingKey = `${percentEncode(opts.consumerSecret)}&${percentEncode(opts.accessTokenSecret)}`;
  oauthParams.oauth_signature = await hmacSha1Base64(signingKey, baseString);

  return (
    'OAuth ' +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
      .join(', ')
  );
}

async function publishToX(account: AccountRow, post: PostRow): Promise<PublishResult> {
  const consumerKey = Deno.env.get('X_CONSUMER_KEY')?.trim();
  const consumerSecret = Deno.env.get('X_CONSUMER_SECRET')?.trim();
  if (!consumerKey || !consumerSecret) {
    throw new Error('X_CONSUMER_KEY/X_CONSUMER_SECRET이 설정되지 않았습니다 (Supabase 함수 시크릿).');
  }
  const accessToken = account.credentials?.accessToken;
  const accessTokenSecret = account.credentials?.accessTokenSecret;
  if (!accessToken || !accessTokenSecret) {
    throw new Error('이 계정에 X 액세스 토큰이 등록되어 있지 않습니다. 계정 관리에서 추가하세요.');
  }
  if (!post.body.trim()) {
    throw new Error('게시 내용이 비어 있습니다.');
  }

  const url = 'https://api.twitter.com/2/tweets';
  const authHeader = await buildOAuth1Header({
    method: 'POST',
    url,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: post.body }),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { id?: string }; detail?: string };
  if (!res.ok) {
    throw new Error(`X API 오류 (${res.status}): ${json.detail ?? JSON.stringify(json)}`);
  }
  const tweetId = json.data?.id;
  if (!tweetId) throw new Error('X API 응답에 tweet id가 없습니다.');
  return { externalId: tweetId, externalUrl: `https://x.com/i/web/status/${tweetId}` };
}

// =============================================
// 플랫폼 라우팅 — X 외 나머지는 커넥터 추가 전까지 스텁
// =============================================

const NOT_IMPLEMENTED: Partial<Record<Platform, string>> = {
  reddit: 'Reddit 커넥터는 아직 구현되지 않았습니다.',
  youtube: 'YouTube는 영상 파일이 필요해 별도 파이프라인이 필요합니다 (아직 미구현).',
  tiktok: 'TikTok Content Posting API 연동은 아직 구현되지 않았습니다.',
  weibo: 'Weibo 커넥터는 아직 구현되지 않았습니다.',
  xiaohongshu: '샤오홍슈 커넥터는 아직 구현되지 않았습니다.',
};

async function publish(platform: Platform, account: AccountRow | null, post: PostRow): Promise<PublishResult> {
  if (platform === 'x') {
    if (!account) throw new Error('게시할 X 계정이 지정되지 않았습니다.');
    return publishToX(account, post);
  }
  throw new Error(NOT_IMPLEMENTED[platform] ?? `지원하지 않는 플랫폼입니다: ${platform}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sb = getServiceClient();

  try {
    await requireAdminCaller(req);
    const body = (await req.json().catch(() => ({}))) as { postId?: string };
    const postId = body.postId?.trim();
    if (!postId) {
      return new Response(JSON.stringify({ error: 'postId가 필요합니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: postRow, error: postError } = await sb
      .from('distribution_posts')
      .select('id, platform, title, body, account_id, status')
      .eq('id', postId)
      .maybeSingle();
    if (postError) throw postError;
    if (!postRow) throw new Error('게시글을 찾을 수 없습니다.');
    const post = postRow as PostRow;

    if (post.status === 'posted') {
      throw new Error('이미 게시된 항목입니다.');
    }

    let account: AccountRow | null = null;
    if (post.account_id) {
      const { data: accountRow, error: accountError } = await sb
        .from('distribution_accounts')
        .select('id, platform, credentials')
        .eq('id', post.account_id)
        .maybeSingle();
      if (accountError) throw accountError;
      account = (accountRow as AccountRow) ?? null;
    }

    try {
      const result = await publish(post.platform, account, post);
      await sb
        .from('distribution_posts')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          external_post_id: result.externalId,
          external_url: result.externalUrl,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);
      return new Response(JSON.stringify({ externalUrl: result.externalUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (publishError) {
      const message = publishError instanceof Error ? publishError.message : String(publishError);
      await sb
        .from('distribution_posts')
        .update({
          status: 'failed',
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);
      throw new Error(message);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('distribution-publish failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
