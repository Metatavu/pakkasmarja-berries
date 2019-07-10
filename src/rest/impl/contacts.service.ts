import * as _ from "lodash";
import { Response, Request } from "express";
import ContactsService from "../api/contacts.service";
import ApplicationRoles from "../application-roles";
import userManagement, { UserProperty } from "../../user-management";
import mailer from "../../mailer";
import { Contact, Address, BasicContact } from "../model/models";
import { config } from "../../config";
import { getLogger, Logger } from "log4js";
import UserRepresentation from "keycloak-admin/lib/defs/userRepresentation";

/**
 * Implementation for Contacts REST service
 */
export default class ContactsServiceImpl extends ContactsService {

  private logger: Logger = getLogger();
  
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

    res.status(200).send(this.translateContact(user));
  }

  /**
   * @inheritdoc
   */
  async findBasicContact(req: Request, res: Response): Promise<void> {
    const userId = req.params.id;
    if (!userId) {
      this.sendNotFound(res);
      return;
    }

    const user = await userManagement.findUser(userId);
    if (!user) {
      this.sendNotFound(res);
      return;
    }

    res.status(200).send(this.translateBasicContact(user));
  }
  
  /**
   * @inheritdoc
   */
  async listContacts(req: Request, res: Response) {
    try {
      if (!this.hasRealmRole(req, ApplicationRoles.LIST_ALL_CONTACTS)) {
        this.sendForbidden(res, "You have no permission to list contacts");
        return;
      }

      const search = req.query.search;
      const users = await userManagement.listUsers({
        search: search
      });

      const contacts = users.map((user: any) => {
        return this.translateContact(user);
      });

      res.status(200).send(contacts);
    } catch (e) {
      this.logger.error("Contacts listing failed", e);
      res.status(500).send("Contacts listing failed on internal server error");
    }
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

    await userManagement.updateUser(this.updateKeycloakUserModel(user, updateContact));
    const updatedUser = await userManagement.findUser(userId);
    this.triggerChangeNotification(user, updatedUser);
    res.status(200).send(this.translateContact(updatedUser));
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
      UserProperty.COMPANY_NAME, 
      UserProperty.BIC, 
      UserProperty.IBAN, 
      UserProperty.TAX_CODE, 
      UserProperty.VAT_LIABLE, 
      UserProperty.AUDIT,
      UserProperty.POSTAL_CODE_1,
      UserProperty.POSTAL_CODE_2,
      UserProperty.STREET_1,
      UserProperty.STREET_2,
      UserProperty.PHONE_1,
      UserProperty.PHONE_2,
      UserProperty.CITY_1,
      UserProperty.CITY_2
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
      const sender = `${config().mail.sender}@${config().mail.domain}`;
      const contactConfig = config().contacts; 

      if (contactConfig && contactConfig.notifications && contactConfig.notifications.email) {
        mailer.send(sender, contactConfig.notifications.email, subject, contents);
      }
    }
  }
  
  /**
   * Translates Keycloak user into BasicContact
   * 
   * @param {Object} user Keycloak user
   * @return {BasicContact} basic contact 
   */
  private translateBasicContact(user: UserRepresentation | null): BasicContact | null {
    if (!user || !user.id) {
      return null;
    }

    try {
      const result: BasicContact = {
        'id': user.id,
        "avatarUrl": userManagement.getUserImage(user),
        "displayName": userManagement.getUserDisplayName(user)
      };
      
      return result;
    } catch (e) {
      this.logger.error("Failed to translate basic contact", user);
      return null;
    }
  }
  
  /**
   * Translates Keycloak user into Contact
   * 
   * @param {Object} user Keycloak user
   * @return {Contact} contact 
   */
  private translateContact(user: UserRepresentation | null): Contact | null {
    if (!user || !user.id) {
      return null;
    }

    try {
      const userVatLiable: string | null = userManagement.getSingleAttribute(user, UserProperty.VAT_LIABLE);
      let vatLiable: Contact.VatLiableEnum | null = null;

      if ("true" == userVatLiable) {
        vatLiable = userVatLiable;
      } else if ("false" == userVatLiable) {
        vatLiable = userVatLiable;
      } else if ("EU" == userVatLiable) {
        vatLiable = userVatLiable;
      }

      const result: Contact = {
        'id': user.id,
        "sapId": userManagement.getSingleAttribute(user, UserProperty.SAP_ID) ||null,
        'firstName': user.firstName || null,
        'lastName': user.lastName || null,
        'companyName': userManagement.getSingleAttribute(user, UserProperty.COMPANY_NAME) || null,
        'phoneNumbers': this.resolveKeycloakUserPhones(user),
        'email': user.email || null,
        'addresses': this.resolveKeycloakUserAddresses(user),
        'BIC': userManagement.getSingleAttribute(user, UserProperty.BIC) || null,
        'IBAN': userManagement.getSingleAttribute(user, UserProperty.IBAN) || null,
        'taxCode': userManagement.getSingleAttribute(user, UserProperty.TAX_CODE) || null,
        'vatLiable': vatLiable,
        'audit': userManagement.getSingleAttribute(user, UserProperty.AUDIT) || null,
        "avatarUrl": userManagement.getUserImage(user),
        "displayName": userManagement.getUserDisplayName(user)
      };
      
      return result;
    } catch (e) {
      this.logger.error("Failed to translate contact", user);
      return null;
    }
  }
  
  /**
   * Updates Keycloak user from contact entity
   * 
   * @param {Object} keycloakUser Keycloak user
   * @param {Contact} contact contact entity
   * @return {Object} updated Keycloak user
   */
  private updateKeycloakUserModel(keycloakUser: UserRepresentation, contact: Contact): UserRepresentation {
    const user = Object.assign({}, keycloakUser, {
      'firstName': contact.firstName,
      'lastName': contact.lastName,
      'email': contact.email
    });

    const phoneNumbers: string[] = contact.phoneNumbers || [];
    const addresses: Address[] = contact.addresses || [];
    
    userManagement.setSingleAttribute(user, UserProperty.COMPANY_NAME, contact.companyName);
    userManagement.setSingleAttribute(user, UserProperty.COMPANY_NAME, contact.companyName);
    userManagement.setSingleAttribute(user, UserProperty.BIC, contact.BIC);
    userManagement.setSingleAttribute(user, UserProperty.IBAN, contact.IBAN);
    userManagement.setSingleAttribute(user, UserProperty.TAX_CODE, contact.taxCode);
    userManagement.setSingleAttribute(user, UserProperty.VAT_LIABLE, contact.vatLiable);
    userManagement.setSingleAttribute(user, UserProperty.AUDIT, contact.audit);
    userManagement.setSingleAttribute(user, UserProperty.PHONE_1, phoneNumbers.length > 0 ? phoneNumbers[0] : null);
    userManagement.setSingleAttribute(user, UserProperty.PHONE_2, phoneNumbers.length > 1 ? phoneNumbers[1] : null);
    userManagement.setSingleAttribute(user, UserProperty.POSTAL_CODE_1, addresses.length > 0 ? addresses[0].postalCode : null);
    userManagement.setSingleAttribute(user, UserProperty.STREET_1, addresses.length > 0 ? addresses[0].streetAddress : null);
    userManagement.setSingleAttribute(user, UserProperty.CITY_1, addresses.length > 0 ? addresses[0].city : null);
    userManagement.setSingleAttribute(user, UserProperty.POSTAL_CODE_2, addresses.length > 1 ? addresses[1].postalCode : null);
    userManagement.setSingleAttribute(user, UserProperty.STREET_2, addresses.length > 1 ? addresses[1].streetAddress : null);
    userManagement.setSingleAttribute(user, UserProperty.CITY_2, addresses.length > 1 ? addresses[1].city : null);
    
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
      const phoneNumber1 = userManagement.getSingleAttribute(user, UserProperty.PHONE_1);
      const phoneNumber2 = userManagement.getSingleAttribute(user, UserProperty.PHONE_2);
      
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
      const postalCode1 = userManagement.getSingleAttribute(user, UserProperty.POSTAL_CODE_1);
      const streetAddress1 = userManagement.getSingleAttribute(user, UserProperty.STREET_1);
      const city1 = userManagement.getSingleAttribute(user, UserProperty.CITY_1);

      const postalCode2 = userManagement.getSingleAttribute(user, UserProperty.POSTAL_CODE_2);
      const streetAddress2 = userManagement.getSingleAttribute(user, UserProperty.STREET_2);
      const city2 = userManagement.getSingleAttribute(user, UserProperty.CITY_2);

      if (postalCode1 && streetAddress1) {
        const address: Address = {
          "streetAddress": streetAddress1,
          "postalCode": postalCode1,
          "city": city1 || null
        };

        result.push(address);  
      } 

      if (postalCode2 && streetAddress2) {
        const address: Address = {
          "streetAddress": streetAddress1,
          "postalCode": postalCode1,
          "city": city2 || null
        };

        result.push(address);  
      } 
    }
    
    return result;
  }
  
}