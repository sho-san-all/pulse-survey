import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendSurveyDM } from '@/lib/slack'

// 認証チェック（cronまたは手動トリガーからのリクエストのみ許可）
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization')
  const queryToken = req.nextUrl.searchParams.get('token')
  return (
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    authHeader === `Bearer ${process.env.MANUAL_TRIGGER_SECRET}` ||
    queryToken === process.env.MANUAL_TRIGGER_SECRET
  )
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 今週の開始日
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1) // 月曜日
  const weekStartStr = weekStart.toISOString().split('T')[0]

  // サーベイレコード作成
  const { data: survey, error: surveyError } = await supabaseAdmin
    .from('surveys')
    .insert({ week_start: weekStartStr })
    .select()
    .single()

  if (surveyError) {
    return NextResponse.json({ error: surveyError.message }, { status: 500 })
  }

  // アクティブなユーザー全員に送信
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, slack_user_id, name')
    .eq('is_active', true)

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const results = await Promise.allSettled(
    users.map((user) => sendSurveyDM(user.slack_user_id))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({
    ok: true,
    survey_id: survey.id,
    sent: succeeded,
    failed,
  })
}