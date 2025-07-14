import { NextRequest, NextResponse } from 'next/server'
import {
  generateUUIDv7,
  isValidUUIDv7,
  extractTimestampFromUUIDv7,
  getUUIDVersion,
} from '@/lib/utils/validation'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'generate'
    const uuid = searchParams.get('uuid')

    switch (action) {
      case 'generate':
        const newUUID = generateUUIDv7()
        return NextResponse.json({
          uuid: newUUID,
          version: 7,
          timestamp: extractTimestampFromUUIDv7(newUUID),
          isValid: true,
        })

      case 'validate':
        if (!uuid) {
          return NextResponse.json(
            { error: 'UUID parameter is required for validation' },
            { status: 400 }
          )
        }

        const isValid = isValidUUIDv7(uuid)
        const result: any = {
          uuid,
          isValid,
          version: null,
          timestamp: null,
        }

        if (isValid) {
          result.version = getUUIDVersion(uuid)
          result.timestamp = extractTimestampFromUUIDv7(uuid)
        }

        return NextResponse.json(result)

      case 'extract':
        if (!uuid) {
          return NextResponse.json(
            { error: 'UUID parameter is required for extraction' },
            { status: 400 }
          )
        }

        if (!isValidUUIDv7(uuid)) {
          return NextResponse.json(
            { error: 'Invalid UUID v7 format' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          uuid,
          version: getUUIDVersion(uuid),
          timestamp: extractTimestampFromUUIDv7(uuid),
          timestampMs: extractTimestampFromUUIDv7(uuid).getTime(),
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: generate, validate, or extract' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error(
      'UUID v7 utility error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to process UUID v7 request' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { count = 1 } = body

    if (count < 1 || count > 100) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 100' },
        { status: 400 }
      )
    }

    const uuids = []
    for (let i = 0; i < count; i++) {
      const uuid = generateUUIDv7()
      uuids.push({
        uuid,
        version: 7,
        timestamp: extractTimestampFromUUIDv7(uuid),
      })
    }

    return NextResponse.json({
      count: uuids.length,
      uuids,
    })
  } catch (error) {
    console.error(
      'UUID v7 batch generation error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.json(
      { error: 'Failed to generate UUID v7 batch' },
      { status: 500 }
    )
  }
}
