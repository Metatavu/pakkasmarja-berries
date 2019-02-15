import { Application } from "express";
import * as Keycloak from "keycloak-connect";

import ChatThreadsServiceImpl from './impl/chatThreads.service';
import ContactsServiceImpl from './impl/contacts.service';
import ContractsServiceImpl from './impl/contracts.service';
import DeliveryPlacesServiceImpl from './impl/deliveryPlaces.service';
import ItemGroupsServiceImpl from './impl/itemGroups.service';
import OperationReportsServiceImpl from './impl/operationReports.service';
import OperationsServiceImpl from './impl/operations.service';
import SignAuthenticationServicesServiceImpl from './impl/signAuthenticationServices.service';

export default class Api {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    
      new ChatThreadsServiceImpl(app, keycloak);
    
      new ContactsServiceImpl(app, keycloak);
    
      new ContractsServiceImpl(app, keycloak);
    
      new DeliveryPlacesServiceImpl(app, keycloak);
    
      new ItemGroupsServiceImpl(app, keycloak);
    
      new OperationReportsServiceImpl(app, keycloak);
    
      new OperationsServiceImpl(app, keycloak);
    
      new SignAuthenticationServicesServiceImpl(app, keycloak);
    
  }
}