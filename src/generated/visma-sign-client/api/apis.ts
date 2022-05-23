export * from './authenticationsApi';
import { AuthenticationsApi } from './authenticationsApi';
export * from './categoriesApi';
import { CategoriesApi } from './categoriesApi';
export * from './documentsApi';
import { DocumentsApi } from './documentsApi';
export * from './filesApi';
import { FilesApi } from './filesApi';
export * from './invitationsApi';
import { InvitationsApi } from './invitationsApi';
export * from './inviteeGroupsApi';
import { InviteeGroupsApi } from './inviteeGroupsApi';
export * from './savedInvitationMessagesApi';
import { SavedInvitationMessagesApi } from './savedInvitationMessagesApi';
import * as http from 'http';

export class HttpError extends Error {
    constructor (public response: http.IncomingMessage, public body: any, public statusCode?: number) {
        super('HTTP request failed');
        this.name = 'HttpError';
    }
}

export { RequestFile } from '../model/models';

export const APIS = [AuthenticationsApi, CategoriesApi, DocumentsApi, FilesApi, InvitationsApi, InviteeGroupsApi, SavedInvitationMessagesApi];
