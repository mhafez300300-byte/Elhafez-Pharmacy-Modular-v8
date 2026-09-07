export type JsonObject = Record<string, any>;
export type AsyncFn<T = any> = (...args: any[]) => Promise<T>;
export type SyncFn<T = any> = (...args: any[]) => T;
export type ServiceRegistry = Record<string, any>;

export interface ModuleDescriptor {
  name: string;
  ownsStores: readonly string[];
  description: string;
}

export interface ModuleRouteDefinition {
  name: string;
  register: (app: any, dependencies: Record<string, any>) => void;
  dependencyKeys: readonly string[];
}
