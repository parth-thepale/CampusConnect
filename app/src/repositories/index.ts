import { env } from '../config/env';
import { IRepositoryRegistry } from './interfaces';
import { getDbPool } from '../config/database';
import { createPostgresRepositories } from './postgres/repositories';
import { createMemoryRepositories } from './memory/repositories';

let activeRegistry: IRepositoryRegistry | null = null;

export function getRepositories(): IRepositoryRegistry {
  if (activeRegistry) {
    return activeRegistry;
  }

  const pool = getDbPool();

  if (pool && !env.USE_IN_MEMORY_REPO) {
    activeRegistry = createPostgresRepositories(pool);
  } else {
    // Fail-safe in-memory repository for unit tests and local mock development
    activeRegistry = createMemoryRepositories();
  }

  return activeRegistry;
}

export function setRepositories(registry: IRepositoryRegistry | null): void {
  activeRegistry = registry;
}

export * from './interfaces';
