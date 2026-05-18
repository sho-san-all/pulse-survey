import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

function buildSurveyBlocks(mindScore: number | null, bodyScore: number | null, completed: boolean) {
  const mindEmojis = ['😫', '😟', '😐', '🙂', '😄']
  const bodyEmojis = ['😔', '😓', '😐', '💪', '🏃']

  if (completed) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *回答ありがとうございます！*\nこころ：${mindScore ? `${mindEmojis[mindScore - 1]} ${mindScore}` : '未回答'} ／ からだ：${bodyScore ? `${bodyEmojis[bodyScore - 1]} ${bodyScore}` : '未回答'}\n\nお疲れさまでした 🙏 来週もよろしくお願いします！`,
        },
      },
    ]
  }

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'こんにちは！今週のチェックインです 👋\n1〜5でタップしてください（1=低い、5=高い）',
      },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*① こころの調子*' },
    },
    {
      type: 'actions',
      block_id: 'mind_score',
      elements: [1, 2, 3, 4, 5].map((n) => ({
        type: 'button',
        text: { type: 'plain_text', text: `${mindEmojis[n - 1]} ${n}` },
        value: String(n),
        action_id: `mind_${n}`,
        ...(mindScore === n ? { style: 'primary' } : {}),
      })),
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: '*② からだの調子*' },
    },
    {
      type: 'actions',
      block_id: 'body_score',
      elements: [1, 2, 3, 4, 5].map((n) => ({
        type: 'button',
        text: { type: 'plain_text', text: `${bodyEmojis[n - 1]} ${n}` },
        value: String(n),
        action_id: `body_${n}`,
        ...(bodyScore === n ? { style: 'primary' } : {}),
      })),
    },
    {
      type: 'input' as const,
      block_id: 'free_text',
      optional: true,
      label: { type: 'plain_text' as const, text: '③ 一言あれば（任意）' },
      element: {
        type: 'plain_text_input' as const,
        action_id: 'free_text_input',
        placeholder: { type: 'plain_text' as const, text: '気になることや、伝えたいことがあれば...' },
        multiline: true,
      },
    },
    {
      type: 'actions' as const,
      block_id: 'submit',
      elements: [{
        type: 'button' as const,
        text: { type: 'plain_text' as const, text: '送信する' },
        style: 'primary' as const,
        action_id: 'submit_survey',
        value: 'submit',
      }],
    },
  ]
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  if (body.startsWith('{')) {
    const parsed = JSON.parse(body)
    if (parsed.type === 'url_verification') {
      return NextResponse.json({ challenge: parsed.challenge })
    }
  }

  if (!body.startsWith('payload=')) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!verifySlackSignature(req, body)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = JSON.parse(decodeURIComponent(body.replace('payload=', '')))
  const { type, actions, user, container, message } = payload

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

    const { data: currentResponse } = await supabaseAdmin
      .from('responses')
      .select('score_mind, score_body')
      .eq('survey_id', survey.id)
      .eq('user_id', userData.id)
      .single()

    const mindScore = currentResponse?.score_mind ?? null
    const bodyScore = currentResponse?.score_body ?? null
    const completed = action.action_id === 'submit_survey'

    await slack.chat.update({
      channel: container.channel_id,
      ts: message.ts,
      text: '今週のチェックイン',
      blocks: buildSurveyBlocks(mindScore, bodyScore, completed),
    })
  }

  return NextResponse.json({ ok: true })
}

async function notifyManagers(userId: string, slackUserId: string, score: number) {
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