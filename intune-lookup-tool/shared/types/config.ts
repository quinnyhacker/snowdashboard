/**
 * Config file shape, kept wire-compatible with the original PowerShell
 * tool's %APPDATA%\IntuneLookupTool\config.json (same PascalCase keys) so
 * an existing config from the PS1 version loads here without modification,
 * and vice versa.
 */
export interface LegacyConfig {
  DeviceCol?: string
  UserCol?: string
  LastFolder?: string
  LastFile?: string

  LegalHoldFile?: string
  LegalHoldFirstCol?: string
  LegalHoldLastCol?: string

  DistrictFile?: string
  DistrictFirstCol?: string
  DistrictLastCol?: string
  DistrictWorkCol?: string
  DistrictHomeCol?: string

  AlwaysOnTop?: boolean
}
