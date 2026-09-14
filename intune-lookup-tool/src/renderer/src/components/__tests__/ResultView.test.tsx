import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useAppStore } from '@renderer/state/store'
import { ResultView } from '../ResultView'

beforeEach(() => {
  useAppStore.setState({ searchResult: undefined })
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
})

describe('ResultView', () => {
  it('shows a placeholder when there is no search yet', () => {
    render(<ResultView />)
    expect(screen.getByText(/Search for a user or device/)).toBeInTheDocument()
  })

  it('shows a no-match message', () => {
    useAppStore.setState({ searchResult: { kind: 'none', mode: 'user', term: 'nobody' } })
    render(<ResultView />)
    expect(screen.getByText(/No user found matching/)).toBeInTheDocument()
    expect(screen.getByText(/nobody/)).toBeInTheDocument()
  })

  it('renders an exact device match with the assigned user', () => {
    useAppStore.setState({
      searchResult: {
        kind: 'exact',
        mode: 'device',
        device: 'LAPTOP-001',
        user: 'jane.doe@kiewit.com',
        enrichment: { legalHold: undefined, district: undefined }
      }
    })
    render(<ResultView />)
    expect(screen.getByText('LAPTOP-001')).toBeInTheDocument()
    expect(screen.getByText('jane.doe@kiewit.com')).toBeInTheDocument()
  })

  it('renders a prominent legal hold banner when flagged', () => {
    useAppStore.setState({
      searchResult: {
        kind: 'exact',
        mode: 'user',
        user: 'jane.doe@kiewit.com',
        devices: ['LAPTOP-001'],
        enrichment: { legalHold: true, district: { found: true, work: 'District 4', home: 'District 2' } }
      }
    })
    render(<ResultView />)
    expect(screen.getByText(/LEGAL HOLD/)).toBeInTheDocument()
    expect(screen.getByText(/Work: District 4/)).toBeInTheDocument()
    expect(screen.getByText(/Home: District 2/)).toBeInTheDocument()
  })

  it('shows a muted "not on legal hold" line when the list is loaded but clear', () => {
    useAppStore.setState({
      searchResult: {
        kind: 'exact',
        mode: 'user',
        user: 'jane.doe@kiewit.com',
        devices: [],
        enrichment: { legalHold: false, district: undefined }
      }
    })
    render(<ResultView />)
    expect(screen.getByText(/Not on legal hold/)).toBeInTheDocument()
  })

  it('renders a list of partial matches', () => {
    useAppStore.setState({
      searchResult: {
        kind: 'partial',
        mode: 'device',
        rows: [
          { label: 'LAPTOP-001', counterpart: 'jane.doe@kiewit.com', enrichment: {} },
          { label: 'LAPTOP-002', counterpart: 'jane.doe@kiewit.com', enrichment: {} }
        ]
      }
    })
    render(<ResultView />)
    expect(screen.getByText(/2 possible matches/)).toBeInTheDocument()
    expect(screen.getByText('LAPTOP-001')).toBeInTheDocument()
    expect(screen.getByText('LAPTOP-002')).toBeInTheDocument()
  })
})
