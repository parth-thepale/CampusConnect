import dotenv from 'dotenv';
dotenv.config();

import { GeminiService } from '../src/services/geminiService';

async function runLiveSmokeTest() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('\n============================================================');
    console.log('LIVE GEMINI VERIFICATION STATUS: PENDING CONFIGURATION');
    console.log('============================================================');
    console.log('GEMINI_API_KEY is not set in your environment or app/.env file.');
    console.log('To run the live Gemini smoke test:');
    console.log('  1. Add your key to app/.env: GEMINI_API_KEY="AIzaSy..."');
    console.log('  2. Run: npx tsx scripts/smokeTestGemini.ts');
    console.log('============================================================\n');
    process.exit(0);
  }

  console.log('\n============================================================');
  console.log('RUNNING LIVE GEMINI AI SMOKE TEST');
  console.log('============================================================');
  console.log('Target Model:', process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite');

  try {
    const service = new GeminiService();
    const fictionalComplaint =
      'The washroom tap near Block B second floor has had no water since this morning.';

    console.log('\nAnalyzing fictional test complaint:');
    console.log(`"${fictionalComplaint}"\n`);

    const result = await service.analyzeComplaintDraft(fictionalComplaint);

    console.log('Received Structured Analysis Result:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\nContract Validation Check:');
    console.log('- Title present:', !!result.title);
    console.log('- Summary present:', !!result.summary);
    console.log('- Suggested Category:', result.suggestedCategory);
    console.log('- Location extracted:', result.extractedLocation);
    console.log('- Routing Suggestion:', result.routingSuggestion?.department);
    console.log('- Provenance:', result.routingSuggestion?.ruleProvenance);
    console.log('- Demo flag:', result.routingSuggestion?.isDemoRule);

    console.log('\nLIVE GEMINI SMOKE TEST: SUCCESSFUL');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('LIVE GEMINI SMOKE TEST FAILED:', err?.message || err);
    process.exitCode = 1;
  }
}

runLiveSmokeTest();
