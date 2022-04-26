export * from './businessPartnersApi';
import { BusinessPartnersApi } from './businessPartnersApi';
export * from './contractsApi';
import { ContractsApi } from './contractsApi';
export * from './itemsApi';
import { ItemsApi } from './itemsApi';
export * from './purchaseDeliveryNotesApi';
import { PurchaseDeliveryNotesApi } from './purchaseDeliveryNotesApi';
export * from './stockTransfersApi';
import { StockTransfersApi } from './stockTransfersApi';
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

export const APIS = [BusinessPartnersApi, ContractsApi, ItemsApi, PurchaseDeliveryNotesApi, StockTransfersApi, SystemApi];
