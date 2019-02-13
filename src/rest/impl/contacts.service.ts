import * as _ from "lodash";
import * as config from "nconf";
import { Response, Request } from "express";
import ContactsService from "../api/contacts.service";
import ApplicationRoles from "../application-roles";
import userManagement from "../../user-management";
import mailer from "../../mailer";
import { Contact, Address } from "../model/models";

/**
 * Implementation for Contacts REST service
 */
export default class ContactsServiceImpl extends ContactsService {
  
  /**
   * @inheritdoc
   */
  async findContact(req: Request, res: Response): Promise<void> {
    const userId = req.params.id;
    if (!userId) {
      this.sendNotFound(res);
      return;
    }
    
    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== userId && !this.hasRealmRole(req, ApplicationRoles.LIST_ALL_CONTACTS)) {
      this.sendForbidden(res, "You have no permission to find this contact");
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user) {
      this.sendNotFound(res);
      return;
    }

    res.status(200).send(this.translateKeycloakUser(user));
  }
  
  /**
   * @inheritdoc
   */
  async listContacts(req: Request, res: Response) {
    if (!this.hasRealmRole(req, ApplicationRoles.LIST_ALL_CONTACTS)) {
      this.sendForbidden(res, "You have no permission to list contacts");
      return;
    }

    const search = req.query.search;
    const users = await userManagement.listUsers({
      search: search
    });

    const contacts = users.map((user: any) => {
      return this.translateKeycloakUser(user);
    });
    
    res.status(200).send(contacts);
  }
  
  /**
   * @inheritdoc
   */
  async updateContact(req: Request, res: Response) {
    const userId = req.params.id;
    if (!userId) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== userId && !this.hasRealmRole(req, ApplicationRoles.UPDATE_OTHER_CONTACTS)) {
      this.sendForbidden(res, "You have no permission to update this contact");
      return;
    }

    const updateContact: Contact = _.isObject(req.body) ? req.body : null;
    if (!updateContact || !_.isArray(updateContact.phoneNumbers) || !_.isArray(updateContact.addresses)) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }
    
    const user = await userManagement.findUser(userId);
    if (!user) {
      this.sendNotFound(res);
      return;
    }
    
    userManagement.updateUser(this.updateKeycloakUserModel(user, updateContact))
      .then(() => {
        return userManagement.findUser(userId);
      })
      .then((updatedUser) => {
        this.triggerChangeNotification(user, updatedUser);
        res.status(200).send(this.translateKeycloakUser(updatedUser));
      })
      .catch((err) => {
        this.sendInternalServerError(res, err);
        return;
      });
  }
  
  /**
   * @inheritdoc
   */
  async updateContactCredentials(req: Request, res: Response) {
    const userId = req.params.id;
    if (!userId) {
      this.sendNotFound(res);
      return;
    }

    const loggedUserId = this.getLoggedUserId(req);
    if (loggedUserId !== userId && !this.hasRealmRole(req, ApplicationRoles.UPDATE_OTHER_CONTACTS)) {
      this.sendForbidden(res, "You have no permission to update this contact");
      return;
    }

    const updateCredentials = _.isObject(req.body) ? req.body : null;
    if (!updateCredentials || !updateCredentials.password) {
      this.sendBadRequest(res, "Failed to parse body");
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user) {
      this.sendNotFound(res);
      return;
    }

    userManagement.resetUserPassword(loggedUserId, updateCredentials.password, false)
      .then(() => {
        res.status(204).send();
      })
      .catch((err: Error) => {
        this.sendInternalServerError(res, err);
      });
  }

  /**
   * Compares old and new user objects and notifies specified email 
   * if there are any significant changes 
   * 
   * @param {Object} oldUser old user object 
   * @param {Object} newUser new user object
   */
  triggerChangeNotification(oldUser: any, newUser: any) {
    const changes: string[] = [];

    const trackedAttributes = [
      userManagement.ATTRIBUTE_COMPANY_NAME, 
      userManagement.ATTRIBUTE_BIC, 
      userManagement.ATTRIBUTE_IBAN, 
      userManagement.ATTRIBUTE_TAX_CODE, 
      userManagement.ATTRIBUTE_VAT_LIABLE, 
      userManagement.ATTRIBUTE_AUDIT,
      userManagement.ATTRIBUTE_POSTAL_CODE_1,
      userManagement.ATTRIBUTE_POSTAL_CODE_2,
      userManagement.ATTRIBUTE_STREET_1,
      userManagement.ATTRIBUTE_STREET_2,
      userManagement.ATTRIBUTE_PHONE_1,
      userManagement.ATTRIBUTE_PHONE_2,
      userManagement.ATTRIBUTE_CITY_1,
      userManagement.ATTRIBUTE_CITY_2
    ];

    const trackedProperties = [
      { "name": "firstName", "title": "Etunimi" },
      { "name": "lastName", "title": "Sukunimi" },
      { "name": "email", "title": "Sähköposti" }
    ];

    trackedProperties.forEach((trackedProperty) => {
      const oldValue = oldUser[trackedProperty.name];
      const newValue = newUser[trackedProperty.name];

      if (oldValue !== newValue) {
        changes.push(`${trackedProperty.title}: ${oldValue} -> ${newValue}`);
      }
    });

    trackedAttributes.forEach((trackedAttribute) => {
      const oldValue = userManagement.getSingleAttribute(oldUser, trackedAttribute) || "";
      const newValue = userManagement.getSingleAttribute(newUser, trackedAttribute) || "";

      if (oldValue !== newValue) {
        changes.push(`${trackedAttribute}: ${oldValue} -> ${newValue}`);
      }
    });

    if (changes.length) {
      const userDisplayName = userManagement.getUserDisplayName(newUser);
      const subject = `${userDisplayName} päivitti tietojaan`;
      const contents = `${userDisplayName} päivitti seuraavat tiedot:\n\n${changes.join("\n")}\n--------------------------------------------------\nTämä on automaattinen sähköposti. Älä vastaa tähän\n--------------------------------------------------`;
      const sender = `${config.get("mail:sender")}@${config.get("mail:domain")}`;
      mailer.send(sender, config.get("contacts:notifications:email"), subject, contents);
    }
  }
  
  /**
   * Translates Keycloak user into Contact
   * 
   * @param {Object} user Keycloak user
   * @return {Contact} contact 
   */
  translateKeycloakUser(user: any) {
    const result: Contact = {
      'id': user.id,
      "sapId": userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_SAP_ID) || undefined,
      'firstName': user.firstName,
      'lastName': user.lastName,
      'companyName': userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_COMPANY_NAME) || undefined,
      'phoneNumbers': this.resolveKeycloakUserPhones(user),
      'email': user.email,
      'addresses': this.resolveKeycloakUserAddresses(user),
      'BIC': userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_BIC) || undefined,
      'IBAN': userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_IBAN) || undefined,
      'taxCode': userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_TAX_CODE) || undefined,
      'vatLiable': userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_VAT_LIABLE) == "true" ? "true" : "false",
      'audit': userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_AUDIT) || undefined
    };

    return result;
  }
  
  /**
   * Updates Keycloak user from contact entity
   * 
   * @param {Object} keycloakUser Keycloak user
   * @param {Contact} contact contact entity
   * @return {Object} updated Keycloak user
   */
  updateKeycloakUserModel(keycloakUser: any, contact: Contact) {
    const user = Object.assign({}, keycloakUser, {
      'firstName': contact.firstName,
      'lastName': contact.lastName,
      'email': contact.email
    });

    const phoneNumbers: string[] = contact.phoneNumbers || [];
    const addresses: Address[] = contact.addresses || [];
    
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_COMPANY_NAME, contact.companyName);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_COMPANY_NAME, contact.companyName);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_BIC, contact.BIC);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_IBAN, contact.IBAN);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_TAX_CODE, contact.taxCode);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_VAT_LIABLE, contact.vatLiable);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_AUDIT, contact.audit);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_PHONE_1, phoneNumbers.length > 0 ? phoneNumbers[0] : null);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_PHONE_2, phoneNumbers.length > 1 ? phoneNumbers[1] : null);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_POSTAL_CODE_1, addresses.length > 0 ? addresses[0].postalCode : null);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_STREET_1, addresses.length > 0 ? addresses[0].streetAddress : null);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_CITY_1, addresses.length > 0 ? addresses[0].city : null);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_POSTAL_CODE_2, addresses.length > 1 ? addresses[1].postalCode : null);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_STREET_2, addresses.length > 1 ? addresses[1].streetAddress : null);
    userManagement.setSingleAttribute(user, userManagement.ATTRIBUTE_CITY_2, addresses.length > 1 ? addresses[1].city : null);
    
    return user;
  }

  /**
   * Resolves Keycloak user's phone numbers
   * 
   * @param {Object} user
   * @return {String[]} array of phone numbers
   */
  resolveKeycloakUserPhones(user: any) {
    const result = [];
    if (user && user.attributes) {
      const phoneNumber1 = userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_PHONE_1);
      const phoneNumber2 = userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_PHONE_2);
      
      if (phoneNumber1) {
        result.push(phoneNumber1);
      }

      if (phoneNumber2) {
        result.push(phoneNumber2);
      }
    }
    
    return _.compact(result);
  }
  
  /**
   * Resolves Keycloak user's addresses
   * 
   * @param {Object} user
   * @return {Address[]} array of addresses
   */
  resolveKeycloakUserAddresses(user: any): Address[] {
    const result: Address[] = [];
    if (user && user.attributes) {
      const postalCode1 = userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_POSTAL_CODE_1);
      const streetAddress1 = userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_STREET_1);
      const city1 = userManagement.getSingleAttribute(user, userManagement.ATTRIBUTE_CITY_1);

      if (postalCode1 && streetAddress1) {
        const address: Address = {
          "streetAddress": streetAddress1,
          "postalCode": postalCode1,
          "city": city1 || undefined
        };

        result.push(address);  
      } 
    }
    
    return result;
  }
  
}