import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/settings?email=user@example.com
// Returns user settings or empty defaults if not found
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const email = searchParams.get('email')?.toLowerCase()

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('user_settings')
            .select('*')
            .eq('user_email', email)
            .single()

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned (not found)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Return settings or defaults if not found
        const settings = data || {
            user_email: email,
            // Profile
            username: null,
            bio: null,
            urls: null,
            // Appearance
            theme: 'light',
            font: 'inter',
            background: 'flicker',
            avatar: null,
            // Notifications
            notification_type: 'all',
            mobile_notifications: false,
            communication_emails: false,
            social_emails: true,
            marketing_emails: false,
            security_emails: true,
            // Display
            sidebar_items: ['chat', 'compiler', 'teams', 'projects'],
        }

        return NextResponse.json({ settings })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to get settings' }, { status: 500 })
    }
}

// PUT /api/settings
// Update user settings (upsert)
// Body: { email: string, ...settings fields }
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json()
        const email = (body?.email || '').toLowerCase()

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 })
        }

        // Build update object from allowed fields
        const allowedFields = [
            'username', 'bio', 'urls',
            'theme', 'font', 'background', 'avatar',
            'notification_type', 'mobile_notifications', 'communication_emails',
            'social_emails', 'marketing_emails', 'security_emails',
            'sidebar_items'
        ]

        const updates: Record<string, any> = {
            user_email: email,
            updated_at: new Date().toISOString(),
        }

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field]
            }
        }

        const { data, error } = await supabaseAdmin
            .from('user_settings')
            .upsert(updates, { onConflict: 'user_email' })
            .select('*')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ settings: data })
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to update settings' }, { status: 500 })
    }
}
