import { env } from '../config/env';
import { IRepositoryRegistry } from './interfaces';
import { createFirestoreRepositories } from './firestore/repositories';
import { createMemoryRepositories } from './memory/repositories';

let activeRegistry: IRepositoryRegistry | null = null;

export function getRepositories(): IRepositoryRegistry {
  if (activeRegistry) {
    return activeRegistry;
  }

  if (env.USE_IN_MEMORY_REPO || env.NODE_ENV === 'test') {
    activeRegistry = createMemoryRepositories();
  } else {
    activeRegistry = createFirestoreRepositories();
  }

  return activeRegistry;
}

export function setRepositories(registry: IRepositoryRegistry | null): void {
  activeRegistry = registry;
}

export * from './interfaces';
