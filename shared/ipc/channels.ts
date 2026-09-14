export const IPC = {
  dashboardGetAllWork: 'dashboard:getAllWork',
  dashboardGetTicketDetail: 'dashboard:getTicketDetail',
  dashboardFindTask: 'dashboard:findTask',

  chatSendMessage: 'chat:sendMessage',
  chatRespondConfirmation: 'chat:respondConfirmation',
  chatStartNewConversation: 'chat:startNewConversation',
  chatTextDelta: 'chat:textDelta',
  chatMessageComplete: 'chat:messageComplete',
  chatConfirmationRequest: 'chat:confirmationRequest',
  chatActivity: 'chat:activity',
  chatError: 'chat:error',

  settingsGetStatus: 'settings:getStatus',
  settingsSetApiKey: 'settings:setApiKey',
  settingsClearApiKey: 'settings:clearApiKey',
  settingsSaveMcpConfig: 'settings:saveMcpConfig',
  settingsGetMcpConfigRaw: 'settings:getMcpConfigRaw',

  prefsGet: 'prefs:get',
  prefsUpdate: 'prefs:update',

  emailSearchForTicket: 'email:searchForTicket'
} as const
