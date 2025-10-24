/**
 * Configuration for allowed users
 *
 * Add email usernames (before @) that are allowed to access this MCP server
 */

const ALLOWED_USERNAMES = new Set<string>([
  // Add your email username here (part before @)
  // Example: 'john.doe' for john.doe@gmail.com
  'leonnwankwo',
  'leonchike'
]);

export function checkUserIsAllowed(username: string): boolean {
  // Allow all users by default if no specific users are configured
  if (ALLOWED_USERNAMES.size === 0) {
    return true;
  }

  return ALLOWED_USERNAMES.has(username);
}

export function getAuthDeniedResponse(username: string): Response {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied</title>
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
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      background: #dc3545;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 32px;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 16px;
      color: #333;
    }
    p {
      color: #666;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    .username {
      font-family: monospace;
      background: #f8f9fa;
      padding: 4px 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">×</div>
    <h1>Access Denied</h1>
    <p>
      The user <span class="username">${username}</span> is not authorized to access this MCP server.
    </p>
    <p>
      Please contact the server administrator to request access.
    </p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 403,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
