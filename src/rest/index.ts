import { Application } from "express";
import * as Keycloak from "keycloak-connect";

import ChatGroupsServiceImpl from './impl/chatGroups.service';
import ChatMessagesServiceImpl from './impl/chatMessages.service';
import ChatThreadsServiceImpl from './impl/chatThreads.service';
import ContactsServiceImpl from './impl/contacts.service';
import ContractsServiceImpl from './impl/contracts.service';
import DataSheetsServiceImpl from './impl/dataSheets.service';
import DeliveriesServiceImpl from './impl/deliveries.service';
import DeliveryLoansServiceImpl from './impl/deliveryLoans.service';
import DeliveryPlacesServiceImpl from './impl/deliveryPlaces.service';
import DeliveryQualitiesServiceImpl from './impl/deliveryQualities.service';
import ItemGroupsServiceImpl from './impl/itemGroups.service';
import NewsArticlesServiceImpl from './impl/newsArticles.service';
import OpeningHoursServiceImpl from './impl/openingHours.service';
import OperationReportsServiceImpl from './impl/operationReports.service';
import OperationsServiceImpl from './impl/operations.service';
import ProductPricesServiceImpl from './impl/productPrices.service';
import ProductsServiceImpl from './impl/products.service';
import PublicFilesServiceImpl from './impl/publicFiles.service';
import ReportsServiceImpl from './impl/reports.service';
import SharedFilesServiceImpl from './impl/sharedFiles.service';
import SignAuthenticationServicesServiceImpl from './impl/signAuthenticationServices.service';
import UnreadsServiceImpl from './impl/unreads.service';
import UserGroupsServiceImpl from './impl/userGroups.service';
import WeekDeliveryPredictionsServiceImpl from './impl/weekDeliveryPredictions.service';

export default class Api {

  /**
   * Constructor
   * 
   * @param app Express app
   * @param keycloak Keycloak
   */
  constructor(app: Application, keycloak: Keycloak) {
    
      new ChatGroupsServiceImpl(app, keycloak);
    
      new ChatMessagesServiceImpl(app, keycloak);
    
      new ChatThreadsServiceImpl(app, keycloak);
    
      new ContactsServiceImpl(app, keycloak);
    
      new ContractsServiceImpl(app, keycloak);
    
      new DataSheetsServiceImpl(app, keycloak);
    
      new DeliveriesServiceImpl(app, keycloak);
    
      new DeliveryLoansServiceImpl(app, keycloak);
    
      new DeliveryPlacesServiceImpl(app, keycloak);
    
      new DeliveryQualitiesServiceImpl(app, keycloak);
    
      new ItemGroupsServiceImpl(app, keycloak);
    
      new NewsArticlesServiceImpl(app, keycloak);
    
      new OpeningHoursServiceImpl(app, keycloak);
    
      new OperationReportsServiceImpl(app, keycloak);
    
      new OperationsServiceImpl(app, keycloak);
    
      new ProductPricesServiceImpl(app, keycloak);
    
      new ProductsServiceImpl(app, keycloak);
    
      new PublicFilesServiceImpl(app, keycloak);
    
      new ReportsServiceImpl(app, keycloak);
    
      new SharedFilesServiceImpl(app, keycloak);
    
      new SignAuthenticationServicesServiceImpl(app, keycloak);
    
      new UnreadsServiceImpl(app, keycloak);
    
      new UserGroupsServiceImpl(app, keycloak);
    
      new WeekDeliveryPredictionsServiceImpl(app, keycloak);
    
  }
}
