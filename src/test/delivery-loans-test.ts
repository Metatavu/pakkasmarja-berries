import * as test from "blue-tape";
import * as request from "supertest";
import auth from "./auth";
import { DeliveryLoan } from "../rest/model/models";
import ApplicationRoles from "../rest/application-roles";
import TestConfig from "./test-config";
import sapMock from "./sap-mock";

/**
 * Interface describing delivery loan request
 */
interface DeliveryLoanRequest {
  contactId: string;
  comment: string;
  loans: DeliveryLoan[];
}

const testDataDir = `${__dirname}/../../src/test/data/`;
const deliveryLoanData: DeliveryLoanRequest = require(`${testDataDir}/delivery-loan.json`);

/**
 * Creates delivery loan
 *
 * @param token token
 * @returns promise for delivery
 */
const createDeliveryLoan = (token: string): Promise<DeliveryLoan[]> => {
  return request(TestConfig.HOST)
    .post("/rest/v1/deliveryLoans")
    .set("Authorization", `Bearer ${token}`)
    .set("Accept", "application/json")
    .send(deliveryLoanData)
    .expect(200)
    .then(response => response.body);
}

test("Create delivery loan", async (t) => {
  await sapMock.deleteMocks();
  const token = await auth.getTokenUser1([ ApplicationRoles.UPDATE_OTHER_DELIVERIES ]);

  try {
    const createdDeliveryLoans = await createDeliveryLoan(token);
    const sentDeliveryloan = deliveryLoanData.loans[0];
    t.notEqual(createdDeliveryLoans, null);
    t.notEqual(createdDeliveryLoans[0], null);
    t.equal(createdDeliveryLoans[0].item, sentDeliveryloan.item);
    t.equal(createdDeliveryLoans[0].loaned, sentDeliveryloan.loaned);
    t.equal(createdDeliveryLoans[0].returned, sentDeliveryloan.returned);
  } finally {
    await sapMock.deleteMocks();
    await auth.removeUser1Roles([ ApplicationRoles.UPDATE_OTHER_DELIVERIES ]);
  }
});
