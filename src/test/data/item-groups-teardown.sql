DELETE FROM Products;
UPDATE ItemGroups SET prerequisiteContractItemGroupId = NULL;
DELETE FROM ItemGroups;