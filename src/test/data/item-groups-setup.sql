DELETE FROM ItemGroups;
INSERT INTO 
    ItemGroups (id, externalId, sapId, name, displayName, category, minimumProfitEstimation, createdAt, updatedAt)
VALUES 
  (1000, '89723408-0f51-11e8-baa0-dfe7c7eae257', '1234', '123456/Test Group 1', 'Test Group 1', 'FROZEN', 100, NOW(), NOW()),
  (2000, '98be1d32-0f51-11e8-bb59-3b8b6bbe9a20', '2345', '234567/Test Group 2', null, 'FRESH', 0, NOW(), NOW());