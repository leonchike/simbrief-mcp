/**
 * OAuth utility functions for cookie-based client approval
 */

const enc = new TextEncoder();

export interface ApprovalDialogState {
  oauthReqInfo?: any;
  [key: string]: any;
}

/**
 * Check if a client has already been approved based on signed cookies
 */
export async function clientIdAlreadyApproved(
  request: Request,
  clientId: string,
  encryptionKey: string
): Promise<boolean> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return false;

  const cookies = parseCookieHeader(cookieHeader);
  const approvalCookie = cookies[`client_${clientId}_approved`];
  const signatureCookie = cookies[`client_${clientId}_signature`];

  if (!approvalCookie || !signatureCookie) return false;

  // Verify the signature
  const key = await getSigningKey(encryptionKey);
  const isValid = await verifySignature(key, signatureCookie, approvalCookie);

  return isValid && approvalCookie === "true";
}

/**
 * Parse redirect approval form submission and generate signed cookies
 */
export async function parseRedirectApproval(
  request: Request,
  encryptionKey: string
): Promise<{ state: ApprovalDialogState; headers: Record<string, string> }> {
  const formData = await request.formData();
  const stateStr = formData.get("state");
  if (!stateStr || typeof stateStr !== "string") {
    throw new Error("Invalid state in form data");
  }

  const state = JSON.parse(stateStr) as ApprovalDialogState;
  if (!state.oauthReqInfo?.clientId) {
    throw new Error("Invalid OAuth request info in state");
  }

  const clientId = state.oauthReqInfo.clientId;
  const key = await getSigningKey(encryptionKey);
  const signature = await signData(key, "true");

  // Set cookies that expire in 1 year
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  const headers = {
    "Set-Cookie": [
      `client_${clientId}_approved=true; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expires.toUTCString()}`,
      `client_${clientId}_signature=${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expires.toUTCString()}`,
    ].join(", "),
  };

  return { state, headers };
}

/**
 * Render the approval dialog HTML
 */
export function renderApprovalDialog(
  _request: Request,
  data: {
    client: any;
    server: {
      name: string;
      description: string;
      logo: string;
    };
    state: ApprovalDialogState;
  }
): Response {
  const { client, server, state } = data;
  const stateJson = JSON.stringify(state);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approve Access</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 32px;
      max-width: 400px;
      width: 100%;
    }
    .logo {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      display: block;
    }
    h1 {
      text-align: center;
      font-size: 24px;
      margin: 0 0 24px;
      color: #333;
    }
    .description {
      text-align: center;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .client-info {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .client-info h3 {
      margin: 0 0 8px;
      font-size: 16px;
      color: #333;
    }
    .client-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }
    .actions {
      display: flex;
      gap: 12px;
    }
    button {
      flex: 1;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .approve {
      background: #4285f4;
      color: white;
    }
    .approve:hover {
      background: #357ae8;
    }
    .cancel {
      background: #f1f3f4;
      color: #5f6368;
    }
    .cancel:hover {
      background: #e8eaed;
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="${server.logo}" alt="${server.name}" class="logo">
    <h1>Authorize ${server.name}</h1>

    <p class="description">
      ${client.name} wants to access your ${server.name} account
    </p>

    <div class="client-info">
      <h3>${client.name}</h3>
      <p>${server.description}</p>
    </div>

    <form method="POST" action="/authorize">
      <input type="hidden" name="state" value="${encodeHtml(stateJson)}">
      <div class="actions">
        <button type="button" class="cancel" onclick="window.close()">Cancel</button>
        <button type="submit" class="approve">Authorize</button>
      </div>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

/**
 * Construct the upstream OAuth authorization URL
 */
export function getUpstreamAuthorizeUrl(params: {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  upstream_url: string;
}): string {
  const url = new URL(params.upstream_url);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.client_id);
  url.searchParams.set("redirect_uri", params.redirect_uri);
  url.searchParams.set("scope", params.scope);
  url.searchParams.set("state", params.state);
  return url.toString();
}

// Helper functions

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

async function getSigningKey(encryptionKey: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(encryptionKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signData(key: CryptoKey, data: string): Promise<string> {
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifySignature(
  key: CryptoKey,
  signatureHex: string,
  data: string
): Promise<boolean> {
  const signatureBytes = new Uint8Array(
    signatureHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );
  return await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes.buffer,
    enc.encode(data)
  );
}

function encodeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
