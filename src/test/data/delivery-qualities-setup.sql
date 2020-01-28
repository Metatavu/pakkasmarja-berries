INSERT INTO 
    ItemGroups (id, externalId, sapId, name, displayName, category, minimumProfitEstimation, createdAt, updatedAt)
VALUES 
  (1005, 'a9d715c6-4a09-11e9-8646-d663bd873d93', '001122', '123456/Test Group 1', 'Test Group 1', 'FRESH', 100, NOW(), NOW());

INSERT INTO
  Products (id, itemGroupId, name, units, unitSize, unitName, sapItemCode, active, createdAt, updatedAt)
VALUES
  ('b1590990-4bbb-11e9-8646-d663bd873d93', 1005, 'Product 1', 5, 0.2, 'ltk', 'SAP1', true, NOW(), NOW());