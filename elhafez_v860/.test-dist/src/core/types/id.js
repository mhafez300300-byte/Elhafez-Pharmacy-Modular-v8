import { randomUUID } from 'node:crypto';
export const newId = (prefix) => `${prefix}_${randomUUID()}`;
