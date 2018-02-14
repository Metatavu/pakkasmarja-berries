INSERT INTO 
    Contracts (externalId, userId, itemGroupId, quantity, startDate, endDate, signDate, termDate, status, remarks, createdAt, updatedAt)
VALUES 
  ('1d45568e-0fba-11e8-9ac4-a700da67a976', '6f1cd486-107e-404c-a73f-50cc1fdabdd6', (SELECT id FROM ItemGroups WHERE externalId = '89723408-0f51-11e8-baa0-dfe7c7eae257'), 50000, DATE('2020-01-01'), DATE('2020-12-31'), DATE('2019-12-14'), DATE('2020-01-02'), 'APPROVED', 'Ready for testing', NOW(), NOW()),
  ('3950f496-0fba-11e8-9611-0b2da5ab56ce', '677e99fd-b854-479f-afa6-74f295052770', (SELECT id FROM ItemGroups WHERE externalId = '98be1d32-0f51-11e8-bb59-3b8b6bbe9a20'), 75200, DATE('2020-01-05'), DATE('2020-05-01'), DATE('2019-11-03'), DATE('2020-01-06'), 'DRAFT', NULL, NOW(), NOW());