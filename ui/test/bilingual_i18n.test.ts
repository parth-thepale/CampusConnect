import test from 'node:test';
import assert from 'node:assert/strict';
import { translations, type Language } from '../src/i18n.js';

function translate(lang: Language, key: string, params?: Record<string, string | number>): string {
  const entry = translations[key];
  let text = entry ? (entry[lang] || entry.en || key) : key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return text;
}

test('1. Core navigation and brand strings translate correctly between English and Hindi', () => {
  // English
  assert.equal(translate('en', 'overview'), 'Overview');
  assert.equal(translate('en', 'report_an_issue'), 'Report an issue');
  assert.equal(translate('en', 'my_tickets'), 'My tickets');
  assert.equal(translate('en', 'sign_in'), 'Sign In');

  // Hindi
  assert.equal(translate('hi', 'overview'), 'अवलोकन');
  assert.equal(translate('hi', 'report_an_issue'), 'समस्या दर्ज करें');
  assert.equal(translate('hi', 'my_tickets'), 'मेरी शिकायतें');
  assert.equal(translate('hi', 'sign_in'), 'साइन इन');
});

test('2. Ticket statuses and issue categories provide accurate Hindi equivalents', () => {
  assert.equal(translate('en', 'status_submitted'), 'Submitted');
  assert.equal(translate('hi', 'status_submitted'), 'सबमिट किया गया');

  assert.equal(translate('en', 'status_in_progress'), 'In progress');
  assert.equal(translate('hi', 'status_in_progress'), 'प्रगति में');

  assert.equal(translate('en', 'status_resolved'), 'Resolved');
  assert.equal(translate('hi', 'status_resolved'), 'समाधान संपन्न');

  assert.equal(translate('hi', 'category_plumbing'), 'नलसाजी / प्लंबिंग');
  assert.equal(translate('hi', 'category_electricity'), 'बिजली / विद्युत');
  assert.equal(translate('hi', 'category_cleanliness'), 'सफ़ाई एवं स्वच्छता');
  assert.equal(translate('hi', 'category_internet'), 'इंटरनेट / नेटवर्क');
});

test('3. Dynamic parameter interpolation works in both languages', () => {
  const enGreeting = translate('en', 'welcome_back_user', { name: 'Priyanshu' });
  assert.equal(enGreeting, 'Welcome back, Priyanshu');

  const hiGreeting = translate('hi', 'welcome_back_user', { name: 'Priyanshu' });
  assert.equal(hiGreeting, 'स्वागत है, Priyanshu');
});

test('4. Graceful fallback on missing keys or languages', () => {
  // Non-existent key returns key itself
  assert.equal(translate('en', 'non_existent_key_xyz'), 'non_existent_key_xyz');
  assert.equal(translate('hi', 'non_existent_key_xyz'), 'non_existent_key_xyz');
});
