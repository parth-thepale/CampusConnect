import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Frontend Build & Security Inspection Tests', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const publicDir = path.join(rootDir, 'public');
  const assetsDir = path.join(publicDir, 'assets');

  it('verifies public build output exists and contains compiled index.html', () => {
    const indexPath = path.join(publicDir, 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);

    const htmlContent = fs.readFileSync(indexPath, 'utf8');
    expect(htmlContent).toContain('<div id="root">');
    expect(htmlContent).toContain('/assets/');
  });

  it('strictly verifies compiled javascript bundle contains no backend secrets or private keys', () => {
    expect(fs.existsSync(assetsDir)).toBe(true);

    const assetFiles = fs.readdirSync(assetsDir);
    const jsFiles = assetFiles.filter((f: string) => f.endsWith('.js'));
    expect(jsFiles.length).toBeGreaterThan(0);

    const forbiddenPatterns = [
      'campusconnect-dev-otp-secret-key-32b',
      'FIREBASE_SERVICE_ACCOUNT_KEY',
      'private_key',
      'client_email',
      'SMTP_PASS',
      'smtp_password',
    ];

    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(content).not.toContain(pattern);
      }
    }
  });

  it('verifies firebase.json hosts from public directory with /api/** Cloud Function rewrite', () => {
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));

    expect(firebaseConfig.hosting.public).toBe('public');
    const apiRewrite = firebaseConfig.hosting.rewrites.find(
      (r: any) => r.source === '/api/**'
    );
    expect(apiRewrite).toBeDefined();
    expect(apiRewrite.function?.functionId).toBe('api');
    expect(apiRewrite.function?.region).toBe('us-central1');
  });
});
