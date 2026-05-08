import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { slack } from '@/lib/slack'
import crypto from 'crypto'

function verifySlackSignature(req: NextRequest, body: string): boolean {
  const timestamp = req.headers.get('x-slack-request-timestamp') || ''
  const signature = req.headers.get('x-slack-signature') || ''
  const signingSecret = process.env.SLACK_SIGNING_SECRET!

  const hmac = crypto.createHmac('sha256', signingSecret)
  hmac.update(`v0:${timestamp}:${body}`)
  const computed = `v0=${hmac.digest('hex')}`

  return computed === signature
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  // URL verification challenge（JSON形式）
  if (body.startsWith('{')) {
    const parsed = JSON.parse(body)
    if (parsed.type === 'url_verification') {
      return NextResponse.json({ challenge: parsed.challenge })
    }
  }

  // Block Kit ボタン回答（payload=...形式）
  if (!body.startsWith('payload=')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!verifySlackSignature(req, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = JSON.parse(decodeURIComponent(body.replace('payload=', '')))
  const { type, actions, user } = payload

  if (type === 'block_actions') {
    const action = actions[0]
    const slackUserId = user.id

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('slack_user_id', slackUserId)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data: survey } = await supabaseAdmin
      .from('surveys')
      .select('id')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    if (action.action_id.startsWith('mind_')) {
      const score = parseInt(action.value)
      await supabaseAdmin.from('responses').upsert({
        survey_id: survey.id,
        user_id: userData.id,
        score_mind: score,
      }, { onConflict: 'survey_id,user_id' })

      if (score <= 2) {
        await notifyManagers(userData.id, slackUserId, score)
      }
    }

    if (action.action_id.startsWith('body_')) {
      const score = parseInt(action.value)
      await supabaseAdmin.from('responses').upsert({
        survey_id: survey.id,
        user_id: userData.id,
        score_body: score,
      }, { onConflict: 'survey_id,user_id' })
    }
  }

  return NextResponse.json({ ok: true })
}

async function notifyManagers(
  userId: string,
  slackUserId: string,
  score: number
) {
  const { data: teamIds } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)

  if (!teamIds || teamIds.length === 0) return

  const { data: managers } = await supabaseAdmin
    .from('team_members')
    .select('users(slack_user_id, name)')
    .eq('role', 'manager')
    .in('team_id', teamIds.map(t => t.team_id))

  const slackUser = await slack.users.info({ user: slackUserId })
  const userName = (slackUser.user as any)?.real_name || 'メンバー'

  for (const manager of managers || []) {
    const managerSlackId = (manager.users as any)?.slack_user_id
    if (!managerSlackId) continue

    const dm = await slack.conversations.open({ users: managerSlackId })
    const channelId = (dm.channel as any).id

    await slack.chat.postMessage({
      channel: channelId,
      text: `⚠️ ${userName}さんのこころの調子が${score}です。声かけを検討してください。`,
    })
  }
}