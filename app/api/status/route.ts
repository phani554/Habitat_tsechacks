import { NextResponse } from 'next/server'
import { getConfiguredServices, getDataSourceSummary } from '@/lib/services/serviceStatus'

export async function GET() {
  try {
    const services = getConfiguredServices()
    const summary = getDataSourceSummary()
    
    return NextResponse.json({
      status: 'ok',
      services,
      summary,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Failed to check service status' },
      { status: 500 }
    )
  }
}
