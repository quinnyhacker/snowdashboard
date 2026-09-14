export const IPC = {
  appGetInitialState: 'app:getInitialState',
  appSetAlwaysOnTop: 'app:setAlwaysOnTop',

  deviceBrowse: 'device:browse',
  deviceConfirmColumns: 'device:confirmColumns',
  deviceChangeColumns: 'device:changeColumns',

  legalHoldBrowse: 'legalHold:browse',
  legalHoldConfirmColumns: 'legalHold:confirmColumns',
  legalHoldChangeColumns: 'legalHold:changeColumns',

  districtBrowse: 'district:browse',
  districtConfirmColumns: 'district:confirmColumns',
  districtChangeColumns: 'district:changeColumns',

  searchRun: 'search:run'
} as const
