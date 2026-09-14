export const IPC = {
  appGetInitialState: 'app:getInitialState',
  appSetAlwaysOnTop: 'app:setAlwaysOnTop',

  deviceBrowse: 'device:browse',
  deviceConfirmColumns: 'device:confirmColumns',
  deviceChangeColumns: 'device:changeColumns',
  deviceRefresh: 'device:refresh',

  legalHoldBrowse: 'legalHold:browse',
  legalHoldConfirmColumns: 'legalHold:confirmColumns',
  legalHoldChangeColumns: 'legalHold:changeColumns',
  legalHoldRefresh: 'legalHold:refresh',

  districtBrowse: 'district:browse',
  districtConfirmColumns: 'district:confirmColumns',
  districtChangeColumns: 'district:changeColumns',
  districtRefresh: 'district:refresh',

  searchRun: 'search:run'
} as const
