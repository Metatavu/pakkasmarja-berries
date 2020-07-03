INSERT INTO 
    DeliveryPlaces (externalId, sapId, name, createdAt, updatedAt)
VALUES 
  ('bad02318-1a44-11e8-87a4-c7808d590a07', '567', 'Test Place 1', NOW(), NOW());

INSERT INTO 
  OpeningHourPeriods (externalId, deliveryPlaceId, beginDate, endDate)
VALUES 
  ("440ba119-39c7-408e-ad51-ad946fb61e08", (SELECT id FROM DeliveryPlaces WHERE externalId = "bad02318-1a44-11e8-87a4-c7808d590a07"), DATE("2020-01-01"), DATE("2020-01-31")),
  ("bc77e201-3e7d-454e-8a94-83d1f2391068", (SELECT id FROM DeliveryPlaces WHERE externalId = "bad02318-1a44-11e8-87a4-c7808d590a07"), DATE("2020-02-01"), DATE("2020-02-15"));

INSERT INTO
  OpeningHourDays (externalId, periodId, dayType)
VALUES
  ("e30084c0-d1b8-4770-8a3f-6952a930618e", (SELECT id FROM OpeningHourPeriods WHERE externalId = "440ba119-39c7-408e-ad51-ad946fb61e08"), "MONDAY"),
  ("7c605df0-38d2-4b33-a8bd-e3aa6adc2995", (SELECT id FROM OpeningHourPeriods WHERE externalId = "440ba119-39c7-408e-ad51-ad946fb61e08"), "TUESDAY"),
  ("3470bec2-ad5c-4bfb-bc43-26e672153b2d", (SELECT id FROM OpeningHourPeriods WHERE externalId = "440ba119-39c7-408e-ad51-ad946fb61e08"), "WEDNESDAY"),
  ("e38d84c0-869d-4003-932d-2e33f28c3887", (SELECT id FROM OpeningHourPeriods WHERE externalId = "440ba119-39c7-408e-ad51-ad946fb61e08"), "THURSDAY"),
  ("f3ab0d30-070c-475d-94e2-492d068eb9eb", (SELECT id FROM OpeningHourPeriods WHERE externalId = "440ba119-39c7-408e-ad51-ad946fb61e08"), "FRIDAY"),
  ("decc9fb7-0300-4998-b5de-08dfca9c6b4e", (SELECT id FROM OpeningHourPeriods WHERE externalId = "440ba119-39c7-408e-ad51-ad946fb61e08"), "SATURDAY"),
  ("45026876-45b1-414e-9cab-26c943c7a837", (SELECT id FROM OpeningHourPeriods WHERE externalId = "440ba119-39c7-408e-ad51-ad946fb61e08"), "SUNDAY"),

  ("e16214c6-81a2-44a4-af64-3b71ea708826", (SELECT id FROM OpeningHourPeriods WHERE externalId = "bc77e201-3e7d-454e-8a94-83d1f2391068"), "MONDAY"),
  ("103ebff3-abc7-4bc6-8b1e-5efb32edd18b", (SELECT id FROM OpeningHourPeriods WHERE externalId = "bc77e201-3e7d-454e-8a94-83d1f2391068"), "TUESDAY"),
  ("e11da717-0fc6-4494-aca8-c7da50c8a428", (SELECT id FROM OpeningHourPeriods WHERE externalId = "bc77e201-3e7d-454e-8a94-83d1f2391068"), "WEDNESDAY"),
  ("d60f7f5d-d089-4c67-ba55-169b38e32728", (SELECT id FROM OpeningHourPeriods WHERE externalId = "bc77e201-3e7d-454e-8a94-83d1f2391068"), "THURSDAY"),
  ("9d2c48f7-9b8c-4dd4-8cf3-f64eaf005d93", (SELECT id FROM OpeningHourPeriods WHERE externalId = "bc77e201-3e7d-454e-8a94-83d1f2391068"), "FRIDAY"),
  ("ae0bda1a-d164-41fb-a516-a82613272324", (SELECT id FROM OpeningHourPeriods WHERE externalId = "bc77e201-3e7d-454e-8a94-83d1f2391068"), "SATURDAY"),
  ("d8895d5d-a861-4d1f-b806-84f0f15594ba", (SELECT id FROM OpeningHourPeriods WHERE externalId = "bc77e201-3e7d-454e-8a94-83d1f2391068"), "SUNDAY");

INSERT INTO
  OpeningHourDayIntervals (externalId, dayId, opens, closes)
VALUES
  ("680bda29-2e87-4e99-b586-d20a62b08d64", (SELECT id FROM OpeningHourDays WHERE externalId = "e30084c0-d1b8-4770-8a3f-6952a930618e"), "2020-01-01 10:00:00", "2020-01-01 16:00:00"),
  ("4a059993-2b65-4b08-8f0d-73efbcb72490", (SELECT id FROM OpeningHourDays WHERE externalId = "7c605df0-38d2-4b33-a8bd-e3aa6adc2995"), "2020-01-01 12:00:00", "2020-01-01 15:00:00"),
  ("78f0ba60-808b-4615-a159-6bfcbd4e0408", (SELECT id FROM OpeningHourDays WHERE externalId = "3470bec2-ad5c-4bfb-bc43-26e672153b2d"), "2020-01-01 10:00:00", "2020-01-01 16:00:00"),
  ("8e634757-b626-4a78-86e0-9674ce7d8441", (SELECT id FROM OpeningHourDays WHERE externalId = "e38d84c0-869d-4003-932d-2e33f28c3887"), "2020-01-01 10:00:00", "2020-01-01 16:00:00"),
  ("55414ebb-06ef-41b7-a32f-805286d92684", (SELECT id FROM OpeningHourDays WHERE externalId = "f3ab0d30-070c-475d-94e2-492d068eb9eb"), "2020-01-01 12:00:00", "2020-01-01 15:00:00"),
  ("572ab109-7847-4ef4-94d8-92c6240af9c5", (SELECT id FROM OpeningHourDays WHERE externalId = "decc9fb7-0300-4998-b5de-08dfca9c6b4e"), "2020-01-01 10:00:00", "2020-01-01 16:00:00"),
  ("0efab7a7-558a-4c80-a82c-891ec27a1eda", (SELECT id FROM OpeningHourDays WHERE externalId = "45026876-45b1-414e-9cab-26c943c7a837"), "2020-01-01 12:00:00", "2020-01-01 15:00:00"),

  ("16764744-8fce-4380-abf7-5fc2551d6eb0", (SELECT id FROM OpeningHourDays WHERE externalId = "e16214c6-81a2-44a4-af64-3b71ea708826"), "2020-02-01 08:00:00", "2020-02-01 14:00:00"),
  ("537c8a58-949f-4e6a-bf1e-5e8fe69c00bb", (SELECT id FROM OpeningHourDays WHERE externalId = "103ebff3-abc7-4bc6-8b1e-5efb32edd18b"), "2020-02-01 09:00:00", "2020-02-01 15:00:00"),
  ("57ffb379-9a66-409f-b0bc-a53552c4a154", (SELECT id FROM OpeningHourDays WHERE externalId = "e11da717-0fc6-4494-aca8-c7da50c8a428"), "2020-02-01 08:00:00", "2020-02-01 14:00:00"),
  ("a0fd3acd-4562-4c3b-91a2-86db954cfee5", (SELECT id FROM OpeningHourDays WHERE externalId = "d60f7f5d-d089-4c67-ba55-169b38e32728"), "2020-02-01 09:00:00", "2020-02-01 15:00:00"),
  ("5392e3f2-ed8c-4a2b-a3d1-08e243c5d387", (SELECT id FROM OpeningHourDays WHERE externalId = "9d2c48f7-9b8c-4dd4-8cf3-f64eaf005d93"), "2020-02-01 08:00:00", "2020-02-01 14:00:00"),
  ("768f868f-55f1-4143-8a07-5a9211f5d07d", (SELECT id FROM OpeningHourDays WHERE externalId = "ae0bda1a-d164-41fb-a516-a82613272324"), "2020-02-01 09:00:00", "2020-02-01 15:00:00"),
  ("78a2c935-da2f-406d-9bc4-bf08074e7d77", (SELECT id FROM OpeningHourDays WHERE externalId = "d8895d5d-a861-4d1f-b806-84f0f15594ba"), "2020-02-01 08:00:00", "2020-02-01 14:00:00");

INSERT INTO
  OpeningHourExceptions (externalId, deliveryPlaceId, exceptionDate)
VALUES
  ("a939b58a-2f36-4a75-9ba7-6554f583fb29", (SELECT id FROM DeliveryPlaces WHERE externalId = "bad02318-1a44-11e8-87a4-c7808d590a07"), DATE("2020-01-15")),
  ("ded00334-561e-4144-b048-6aed70c52872", (SELECT id FROM DeliveryPlaces WHERE externalId = "bad02318-1a44-11e8-87a4-c7808d590a07"), DATE("2020-02-03"));

INSERT INTO
  OpeningHourExceptionIntervals (externalId, exceptionId, opens, closes)
VALUES
  ("33d63904-7184-48bc-92bb-78bdaa21aa0c", (SELECT id FROM OpeningHourExceptions WHERE externalId = "a939b58a-2f36-4a75-9ba7-6554f583fb29"), "2020-01-01 12:00:00", "2020-01-01 13:00:00"),
  ("1e684778-3251-4d00-89de-0cfdc5810019", (SELECT id FROM OpeningHourExceptions WHERE externalId = "a939b58a-2f36-4a75-9ba7-6554f583fb29"), "2020-01-01 13:30:00", "2020-01-01 15:00:00"),
  ("6cb36702-9ac0-4366-8171-be8d000d82da", (SELECT id FROM OpeningHourExceptions WHERE externalId = "ded00334-561e-4144-b048-6aed70c52872"), "2020-01-01 11:30:00", "2020-01-01 12:30:00"),
  ("4ff281d8-4b73-4a39-85cf-7490f12b9d57", (SELECT id FROM OpeningHourExceptions WHERE externalId = "ded00334-561e-4144-b048-6aed70c52872"), "2020-01-01 13:30:00", "2020-01-01 16:00:00");