export * from './entriesApi';
import { EntriesApi } from './entriesApi';
export * from './systemApi';
import { SystemApi } from './systemApi';
import * as http from 'http';

export class HttpError extends Error {
    constructor (public response: http.IncomingMessage, public body: any, public statusCode?: number) {
        super('HTTP request failed');
        this.name = 'HttpError';
    }
}

export { RequestFile } from '../model/models';

export const APIS = [EntriesApi, SystemApi];
