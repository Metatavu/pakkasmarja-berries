DELETE FROM ItemGroups;
INSERT INTO 
    ItemGroups (id, externalId, sapId, name, displayName, category, minimumProfitEstimation, createdAt, updatedAt)
VALUES 
  (1005, 'a9d715c6-4a09-11e9-8646-d663bd873d93', '001122', '123456/Test Group 1', 'Test Group 1', 'FROZEN', 100, NOW(), NOW()),
  (2005, 'a9d71b20-4a09-11e9-8646-d663bd873d93', '112233', '234567/Test Group 2', null, 'FRESH', 0, NOW(), NOW());