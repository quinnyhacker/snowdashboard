import { promises as fs } from 'node:fs'
import Papa from 'papaparse'
import type { CsvRow } from '@shared/domain/lookupIndex'

export interface ParsedCsv {
  headers: string[]
  rows: CsvRow[]
}

export async function parseCsvFile(filePath: string): Promise<ParsedCsv> {
  const text = await fs.readFile(filePath, 'utf-8')
  const result = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true })
  const headers = result.meta.fields ?? []
  return { headers, rows: result.data }
}
