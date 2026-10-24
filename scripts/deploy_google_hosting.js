import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const SITE_ID = 'campusconnect-ff8f1';
const PROJECT_ID = 'campusconnect-ff8f1';
const DIST_DIR = join(process.cwd(), 'ui', 'dist');

async function main() {
  console.log(`[Google Hosting] Preparing direct Google deployment for site: ${SITE_ID}...`);

  // 1. Get Google OAuth access token from authenticated gcloud
  const token = execSync('gcloud auth print-access-token').toString().trim();
  if (!token) throw new Error('No Google Cloud access token found from gcloud');

  const headers = {
    Authorization: `Bearer ${token}`,
    'x-goog-user-project': PROJECT_ID,
    'Content-Type': 'application/json',
  };

  // 2. Create new Version on Firebase Hosting
  console.log('[Google Hosting] Creating new site version...');
  const createVerRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      config: {
        rewrites: [
          { glob: '**', path: '/index.html' }
        ]
      }
    })
  });

  const versionData = await createVerRes.json();
  if (!createVerRes.ok) {
    throw new Error(`Failed to create version: ${JSON.stringify(versionData)}`);
  }
  const versionName = versionData.name;
  console.log(`[Google Hosting] Version created: ${versionName}`);

  // 3. Scan dist, gzip, and hash all files
  function getAllFiles(dir) {
    let results = [];
    for (const item of readdirSync(dir)) {
      const full = join(dir, item);
      if (statSync(full).isDirectory()) {
        results = results.concat(getAllFiles(full));
      } else {
        results.push(full);
      }
    }
    return results;
  }

  const filePaths = getAllFiles(DIST_DIR);
  const filesMap = {};
  const hashToBuffer = {};

  for (const f of filePaths) {
    const raw = readFileSync(f);
    const gzipped = gzipSync(raw, { level: 9 });
    const hash = createHash('sha256').update(gzipped).digest('hex');
    const rel = '/' + relative(DIST_DIR, f).replace(/\\/g, '/');
    filesMap[rel] = hash;
    hashToBuffer[hash] = gzipped;
  }

  console.log(`[Google Hosting] Gzipped & hashed ${Object.keys(filesMap).length} files for deployment.`);

  // 4. Populate files
  console.log('[Google Hosting] Populating version files...');
  const populateRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/${versionName}:populateFiles`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ files: filesMap })
  });
  const populateData = await populateRes.json();
  if (!populateRes.ok) {
    throw new Error(`Failed to populate files: ${JSON.stringify(populateData)}`);
  }

  const uploadUrl = populateData.uploadUrl;
  const requiredHashes = populateData.uploadRequiredHashes || [];
  console.log(`[Google Hosting] ${requiredHashes.length} files require binary upload.`);

  // 5. Upload required files
  for (const hash of requiredHashes) {
    const buffer = hashToBuffer[hash];
    console.log(`[Google Hosting] Uploading blob: ${hash.slice(0, 12)}...`);
    const uploadRes = await fetch(`${uploadUrl}/${hash}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-goog-user-project': PROJECT_ID,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed for hash ${hash} (${uploadRes.status}): ${errText}`);
    }
  }

  // 6. Finalize Version
  console.log('[Google Hosting] Finalizing version...');
  const finalizeRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/${versionName}?update_mask=status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status: 'FINALIZED' })
  });
  const finalizeData = await finalizeRes.json();
  if (!finalizeRes.ok) {
    throw new Error(`Failed to finalize version: ${JSON.stringify(finalizeData)}`);
  }

  // 7. Release Version to live
  console.log('[Google Hosting] Releasing version to production on Google CDN...');
  const releaseRes = await fetch(`https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/releases?versionName=${versionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: 'Direct deployment of CampusConnect fullstack build to Google Hosting'
    })
  });
  const releaseData = await releaseRes.json();
  if (!releaseRes.ok) {
    throw new Error(`Failed to release: ${JSON.stringify(releaseData)}`);
  }

  console.log('\n=============================================================');
  console.log(' SUCCESS: Hosted directly on Google CDN!');
  console.log(` Google Hosting Live URL: https://${SITE_ID}.web.app`);
  console.log(` Alternate Google URL:   https://${SITE_ID}.firebaseapp.com`);
  console.log('=============================================================\n');
}

main().catch((err) => {
  console.error('[Google Hosting Deploy Error]:', err);
  process.exit(1);
});
