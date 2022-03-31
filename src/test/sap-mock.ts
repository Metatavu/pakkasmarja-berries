import { EntriesApi } from "../generated/odata-client/api";

const testDataDir = `${__dirname}/../../src/test/data/`;
const businessPartners = require(`${testDataDir}/erp/business-partners.json`);

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
   * Delete all mocks
   */
  public deleteMocks = () => {
    return this.getEntriesApi().deleteEntries();
  }

  /**
   * Returns entries API
   * 
   * @returns entries API
   */
  private getEntriesApi = () => {
    return new EntriesApi("http://sap-mock:8080");
  }
  
};