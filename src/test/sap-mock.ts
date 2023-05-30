import { EntriesApi } from "../generated/odata-client/api";
import testConfig from "./test-config";

const testDataDir = `${__dirname}/../../src/test/data/`;
const businessPartners = require(`${testDataDir}/erp/business-partners.json`);
const items = require(`${testDataDir}/erp/items.json`);
const contracts = require(`${testDataDir}/erp/contracts.json`);

/**
 * Mock client for odata-mock
 */
export default new class SapMock {

  /**
   * Mock business partner
   *
   * @param id id
   * @returns mocked entry
   */
  public mockBusinessPartner = async (id: string) => {
    try {
      const data = JSON.stringify(businessPartners[id]);

      return await this.getEntriesApi().createEntry({
        data: data,
        name: "BusinessPartner"
      });
    } catch (e) {
      console.error("SAP Mock request failed", e);
      return null;
    }
  };

  /**
   * Mock item
   *
   * @param id id
   * @returns mocked entry
   */
  public mockItem = async (id: string) => {
    try {
      const data = JSON.stringify(items[id]);

      return await this.getEntriesApi().createEntry({
        data: data,
        name: "Item"
      });
    } catch (e) {
      console.error("SAP Mock request failed", e);
      return null;
    }
  };

  /**
   * Mocks contract
   *
   * @param id id
   * @returns mocked entry
   */
  public mockContract = async (id: string) => {
    try {
      const data = JSON.stringify(contracts[id]);

      return await this.getEntriesApi().createEntry({
        data: data,
        name: "BlanketAgreement"
      });
    } catch (e) {
      console.error("SAP Mock request failed", e);
      return null;
    }
  }

  /**
   * Delete all mocks
   */
  public deleteMocks = () => {
    return this.getEntriesApi().deleteEntries();
  }

  /**
   * Returns mock entry
   *
   * @param entryId entry ID
   */
  public getMockEntry = (entryId: string) => {
    return this.getEntriesApi().findEntry(entryId);
  }

  /**
   * Returns entries API
   *
   * @returns entries API
   */
  private getEntriesApi = () => {
    return new EntriesApi(testConfig.SAP_TEST_CLIENT_HOST);
  }

};