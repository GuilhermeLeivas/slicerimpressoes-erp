/**
 * Contracts at the application boundary. Adapters are injected in Erp.
 * These types describe behavior, not a particular database or file service.
 *
 * @typedef {Object} Store
 * @property {function(): Promise<Object>} read Returns a detached state snapshot.
 * @property {function(function(Object): any): Promise<any>} transaction
 *   Runs a mutation with exclusive access and commits all changes atomically.
 *   A rejected mutation must persist no changes. Returns the mutation result.
 *
 * @typedef {Object} AssetStore
 * @property {function({name:string, data:string}): Promise<Asset>} put
 *   Validates and stores a Base64 payload; IDs are immutable and stable.
 * @property {function(string): Promise<Asset|null>} get Reads metadata by ID.
 * @property {function(string): Promise<(Asset & {bytes:Uint8Array})|null>} bytes
 *   Reads content by ID. Unknown or unsafe IDs return null.
 *
 * @typedef {Object} Asset
 * @property {string} id
 * @property {string} name
 * @property {string} mime
 * @property {number} size
 */
export {};
