export function renderAuthTestPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CampusConnect - Authentication Diagnostic Test Harness</title>
  <style>
    :root {
      --primary: #1e40af;
      --primary-hover: #1d4ed8;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --success: #16a34a;
      --error: #dc2626;
      --warning: #d97706;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--border);
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: var(--primary);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 9999px;
      background: #e0e7ff;
      color: #3730a3;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    @media (max-width: 768px) {
      .grid { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card h2 {
      margin-top: 0;
      font-size: 18px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      color: #1e293b;
    }
    .form-group {
      margin-bottom: 14px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #334155;
    }
    input[type="text"], input[type="email"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.2);
    }
    button {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s;
    }
    button:hover {
      background: var(--primary-hover);
    }
    button:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
    }
    button.btn-secondary {
      background: #475569;
    }
    button.btn-secondary:hover {
      background: #334155;
    }
    button.btn-danger {
      background: var(--error);
    }
    button.btn-danger:hover {
      background: #b91c1c;
    }
    button.btn-outline {
      background: white;
      color: #334155;
      border: 1px solid var(--border);
    }
    button.btn-outline:hover {
      background: #f1f5f9;
    }
    .status-panel {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-top: 12px;
      font-size: 13px;
    }
    .status-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .status-label {
      color: var(--text-muted);
      font-weight: 500;
    }
    .status-value {
      font-weight: 600;
      font-family: monospace;
    }
    .console-box {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 6px;
      padding: 16px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      max-height: 260px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .alert {
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .alert-info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
    }
    .alert-warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #92400e;
    }
    .btn-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
  </style>
  <!-- CampusConnect Test Harness Assets -->
</head>
<body>
  <div class="container">
    <header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1>CampusConnect &bull; Authentication Test Harness</h1>
          <p style="margin: 0; color: var(--text-muted); font-size: 14px;">
            Diagnostic verification for Google OAuth and 6-Digit Email OTP authentication.
          </p>
        </div>
        <span class="badge">TEST HARNESS ONLY</span>
      </div>
    </header>

    <div id="config-notice" class="alert alert-info">
      Initializing diagnostic client and checking backend configuration...
    </div>

    <!-- Active Identity Overview -->
    <div class="card" style="margin-bottom: 20px;">
      <h2>Authenticated User Identity</h2>
      <div class="status-panel">
        <div class="status-row">
          <span class="status-label">Authentication State:</span>
          <span id="auth-state" class="status-value" style="color: var(--error);">Signed Out</span>
        </div>
        <div class="status-row">
          <span class="status-label">User UID:</span>
          <span id="auth-uid" class="status-value">—</span>
        </div>
        <div class="status-row">
          <span class="status-label">Verified Email:</span>
          <span id="auth-email" class="status-value">—</span>
        </div>
        <div class="status-row">
          <span class="status-label">Server-Resolved Role:</span>
          <span id="auth-role" class="status-value" style="color: var(--primary);">—</span>
        </div>
        <div class="status-row">
          <span class="status-label">Token Preview:</span>
          <span id="auth-token" class="status-value" style="font-size: 11px;">—</span>
        </div>
      </div>
      <div style="margin-top: 14px;">
        <button id="btn-signout" class="btn-danger" style="display: none;" onclick="handleSignOut()">Sign Out</button>
      </div>
    </div>

    <!-- Sign-in Methods Grid -->
    <div class="grid">
      <!-- Method 1: Google OAuth -->
      <div class="card">
        <h2>Method 1: Google OAuth</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
          Signs in using Firebase Authentication Google provider popup.
        </p>
        <button id="btn-google" class="btn-outline" style="width: 100%; justify-content: center;" onclick="handleGoogleSignIn()">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          Continue with Google
        </button>
      </div>

      <!-- Method 2: 6-Digit Email OTP -->
      <div class="card">
        <h2>Method 2: Six-Digit Email OTP</h2>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
          Passwordless numeric code sent to student campus email.
        </p>

        <div class="form-group">
          <label for="otp-email">Student Email Address</label>
          <input type="email" id="otp-email" placeholder="student@campus.edu">
        </div>
        <button id="btn-request-code" style="width: 100%; justify-content: center; margin-bottom: 16px;" onclick="handleRequestOtp()">
          Request 6-Digit Code
        </button>

        <div id="verify-section" style="display: none; border-top: 1px dashed var(--border); padding-top: 14px;">
          <div class="form-group">
            <label for="otp-code">Enter 6-Digit Code</label>
            <input type="text" id="otp-code" maxlength="6" placeholder="123456" style="letter-spacing: 4px; font-size: 18px; text-align: center;">
          </div>
          <button id="btn-verify-code" class="btn-secondary" style="width: 100%; justify-content: center;" onclick="handleVerifyOtp()">
            Verify Code & Exchange Token
          </button>
        </div>
      </div>
    </div>

    <!-- API Security & Role Verification Suite -->
    <div class="card" style="margin-bottom: 20px;">
      <h2>Role & Authorization Verification</h2>
      <p style="font-size: 13px; color: var(--text-muted);">
        Test how the backend authorizes API requests using the active Firebase ID token.
      </p>

      <div class="btn-group">
        <button onclick="testMeEndpoint()">1. GET /api/auth/me (Current User Profile)</button>
        <button onclick="testIntakesEndpoint()">2. GET /api/intakes (Student Access)</button>
        <button class="btn-outline" onclick="testStaffEndpoint()">3. GET /api/staff/tickets (Staff Isolation Test)</button>
        <button class="btn-outline" onclick="testUnauthenticatedEndpoint()">4. Anonymous Call (401 Test)</button>
      </div>
    </div>

    <!-- Execution Logs Output -->
    <div class="card">
      <h2>Execution Diagnostic Log</h2>
      <div id="log-box" class="console-box">[Ready] Diagnostic harness loaded. Click any test action to inspect results.</div>
    </div>
  </div>

  <script>
    let currentIdToken = null;
    let activeChallengeId = null;
    let firebaseReady = false;

    function log(message, obj) {
      const box = document.getElementById('log-box');
      const time = new Date().toLocaleTimeString();
      let text = \`[\${time}] \${message}\`;
      if (obj) {
        text += '\\n' + JSON.stringify(obj, null, 2);
      }
      box.textContent = text + '\\n\\n' + box.textContent;
    }

    async function initClient() {
      try {
        const res = await fetch('/api/auth/config');
        const json = await res.json();
        const notice = document.getElementById('config-notice');

        notice.className = 'alert alert-info';
        notice.innerHTML = '<strong>Backend Auth Active:</strong> Mode: <code>' + (json.data?.authMode || 'jwt') + '</code> | Direct OTP &amp; Bearer JWT sessions enabled.';
        log('Backend auth initialized:', json.data);
      } catch (err) {
        log('Error loading /api/auth/config:', err.message);
      }
    }

    async function handleGoogleSignIn() {
      alert('Google Sign-In uses Google Identity Services. In development, use 6-Digit Email OTP or Dev Auth headers.');
    }

    async function handleRequestOtp() {
      const email = document.getElementById('otp-email').value.trim();
      if (!email) {
        alert('Please enter an email address');
        return;
      }

      log(\`Requesting 6-digit OTP for: \${email}\`);
      try {
        const res = await fetch('/api/auth/email/request-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        log('Request Code Response:', data);

        if (!data.success) {
          alert('Failed to request code: ' + (data.error?.message || data.message));
          return;
        }

        activeChallengeId = data.data?.challengeId;
        document.getElementById('verify-section').style.display = 'block';
        alert('Verification code dispatched! Please check your mailbox.');
      } catch (err) {
        log('Network error requesting code:', err.message);
        alert('Network error: ' + err.message);
      }
    }

    async function handleVerifyOtp() {
      const email = document.getElementById('otp-email').value.trim();
      const code = document.getElementById('otp-code').value.trim();

      if (!code || code.length !== 6) {
        alert('Please enter the 6-digit code');
        return;
      }

      log(\`Verifying OTP for \${email} with challenge \${activeChallengeId || '(latest)'}\`);
      try {
        const res = await fetch('/api/auth/email/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            code,
            challengeId: activeChallengeId
          })
        });
        const data = await res.json();
        log('Verify Code Response:', data);

        if (!data.success) {
          alert('Verification failed: ' + (data.error?.message || data.message));
          return;
        }

        const token = data.data.token || data.data.customToken;
        currentIdToken = token;
        log('Session JWT token received from backend.');

        document.getElementById('auth-state').textContent = 'Signed In';
        document.getElementById('auth-state').style.color = 'var(--success)';
        document.getElementById('auth-uid').textContent = data.data.user.uid;
        document.getElementById('auth-email').textContent = data.data.user.email || 'None';
        document.getElementById('auth-role').textContent = data.data.user.role;
        document.getElementById('auth-token').textContent = token.slice(0, 24) + '... (valid Bearer token)';
        document.getElementById('btn-signout').style.display = 'inline-flex';

        await testMeEndpoint(true);
        alert('Successfully signed in via 6-Digit Email OTP!');
      } catch (err) {
        log('Error verifying OTP:', err.message);
        alert('Verification error: ' + err.message);
      }
    }

    async function handleSignOut() {
      currentIdToken = null;
      document.getElementById('auth-state').textContent = 'Signed Out';
      document.getElementById('auth-state').style.color = 'var(--error)';
      document.getElementById('auth-uid').textContent = '—';
      document.getElementById('auth-email').textContent = '—';
      document.getElementById('auth-role').textContent = '—';
      document.getElementById('auth-token').textContent = '—';
      document.getElementById('btn-signout').style.display = 'none';
      log('User signed out.');
    }

    async function testMeEndpoint(silent) {
      if (!currentIdToken) {
        alert('You must sign in first to obtain a Bearer ID token.');
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': \`Bearer \${currentIdToken}\` }
        });
        const data = await res.json();
        if (!silent) log('GET /api/auth/me Result:', data);

        if (data.success && data.data) {
          document.getElementById('auth-role').textContent = data.data.role;
        }
      } catch (err) {
        log('Error calling /api/auth/me:', err.message);
      }
    }

    async function testIntakesEndpoint() {
      if (!currentIdToken) {
        alert('You must sign in first.');
        return;
      }
      try {
        const res = await fetch('/api/intakes', {
          headers: { 'Authorization': \`Bearer \${currentIdToken}\` }
        });
        const data = await res.json();
        log('GET /api/intakes (Student Access) Result:', data);
      } catch (err) {
        log('Error calling /api/intakes:', err.message);
      }
    }

    async function testStaffEndpoint() {
      if (!currentIdToken) {
        alert('You must sign in first.');
        return;
      }
      try {
        const res = await fetch('/api/staff/tickets', {
          headers: { 'Authorization': \`Bearer \${currentIdToken}\` }
        });
        const data = await res.json();
        log('GET /api/staff/tickets (Staff Isolation Test) Result:', data);
        if (res.status === 403) {
          log('✅ EXPECTED RESULT: 403 Forbidden received. Student role cannot access staff tickets queue.');
        }
      } catch (err) {
        log('Error calling /api/staff/tickets:', err.message);
      }
    }

    async function testUnauthenticatedEndpoint() {
      try {
        const res = await fetch('/api/tickets');
        const data = await res.json();
        log('Anonymous Call GET /api/tickets (Expected 401):', data);
        if (res.status === 401) {
          log('✅ EXPECTED RESULT: 401 Unauthorized received. Protected routes require Bearer token.');
        }
      } catch (err) {
        log('Error calling anonymous /api/tickets:', err.message);
      }
    }

    window.onload = initClient;
  </script>
</body>
</html>`;
}
