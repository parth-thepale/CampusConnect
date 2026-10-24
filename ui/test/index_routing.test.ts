import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests verifying the conditional index landing vs overview / login routing logic
 */

interface MockStorage {
  [key: string]: string;
}

function createMockStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  clear: () => void;
} {
  const store: MockStorage = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
}

function resolveInitialView({
  session,
  visitedFlag,
  queryString = '',
  hash = '',
}: {
  session: { token: string; user: { role: string; name: string } } | null;
  visitedFlag: string | null;
  queryString?: string;
  hash?: string;
}): 'landing' | 'overview' | 'login' {
  const params = new URLSearchParams(queryString);
  if (params.get('landing') === 'true' || hash === '#landing') {
    return 'landing';
  }
  if (params.get('login') === 'true' || hash === '#login') {
    return session ? 'overview' : 'login';
  }
  // If user has an active session, they are returning -> opens into Overview tab
  if (session) {
    return 'overview';
  }
  // If user is brand new (never visited before), show index page on top
  if (!visitedFlag) {
    return 'landing';
  }
  // Returning visitor without session -> login
  return 'login';
}

test('1. New user without active session visits for first time -> lands on index page', () => {
  const storage = createMockStorage();
  const initialView = resolveInitialView({
    session: null,
    visitedFlag: storage.getItem('campusconnect_visited'),
  });
  assert.equal(initialView, 'landing', 'New user must see the index landing page on top');
});

test('2. User with active stored session -> opens normally into overview tab', () => {
  const storage = createMockStorage();
  storage.setItem('campusconnect_visited', 'true');
  const mockSession = { token: 'mock-token', user: { role: 'student', name: 'John Doe' } };

  const initialView = resolveInitialView({
    session: mockSession,
    visitedFlag: storage.getItem('campusconnect_visited'),
  });
  assert.equal(initialView, 'overview', 'Existing authenticated user opens directly into overview tab');
});

test('3. New user clicks CTA to enter portal -> marks visited and switches to login', () => {
  const storage = createMockStorage();
  // Initially new
  assert.equal(storage.getItem('campusconnect_visited'), null);

  // User clicks "Sign In" or "Get Started"
  storage.setItem('campusconnect_visited', 'true');

  // Next evaluation
  const nextView = resolveInitialView({
    session: null,
    visitedFlag: storage.getItem('campusconnect_visited'),
  });
  assert.equal(nextView, 'login', 'Proceeding from index page transitions to login gateway');
});

test('4. URL override (?landing=true or #landing) displays index page on demand', () => {
  const storage = createMockStorage();
  storage.setItem('campusconnect_visited', 'true');

  const paramView = resolveInitialView({
    session: null,
    visitedFlag: storage.getItem('campusconnect_visited'),
    queryString: '?landing=true',
  });
  assert.equal(paramView, 'landing', 'Query parameter ?landing=true forces index landing display');

  const hashView = resolveInitialView({
    session: null,
    visitedFlag: storage.getItem('campusconnect_visited'),
    hash: '#landing',
  });
  assert.equal(hashView, 'landing', 'Hash #landing forces index landing display');
});
