'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Member = {
  id: string
  name: string
  slack_user_id: string
  role: string
  mind: number | null
  body: number | null
  alerts: string[]
  freeTexts: { date: string; text: string; alert: boolean }[]
}

function scoreColor(score: number | null) {
  if (score === null) return 'bg-yellow-100 text-yellow-700'
  if (score <= 2) return 'bg-red-100 text-red-700'
  if (score === 3) return 'bg-gray-100 text-gray-600'
  return 'bg-green-100 text-green-700'
}

function alertColor(alert: string) {
  if (alert === '低スコア継続') return 'bg-red-100 text-red-700'
  if (alert === '急落') return 'bg-orange-100 text-orange-700'
  if (alert === '未回答') return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

function alertBorderColor(alerts: string[]) {
  if (alerts.includes('低スコア継続')) return 'border-red-200 bg-red-50'
  if (alerts.includes('急落') || alerts.includes('未回答')) return 'border-orange-200 bg-orange-50'
  if (alerts.includes('スコア固定')) return 'border-gray-200 bg-gray-50'
  return 'border-gray-200 bg-white'
}

function alertMessage(alert: string) {
  if (alert === '低スコア継続') return 'こころの調子が2以下を2週連続 — 声かけを検討してください'
  if (alert === '急落') return 'こころの調子が急落 — 何かあったか確認を'
  if (alert === '未回答') return '2週連続未回答 — 状況を確認してみましょう'
  if (alert === 'スコア固定') return '4週連続同スコア — 本音が出にくい可能性があります'
  return ''
}

import { Suspense } from 'react'

// 元の `export default function Dashboard()` を `function DashboardContent()` に変更

function DashboardContent() {
  const searchParams = useSearchParams()
  const slackId = searchParams.get('slack_id')

  const [viewer, setViewer] = useState<{ role: string; name: string; id: string } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openMember, setOpenMember] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!slackId) {
      setError('slack_idが指定されていません')
      setLoading(false)
      return
    }
    fetchData(slackId)
  }, [slackId])

  async function fetchData(slackId: string) {

    // 閲覧者情報を取得
    const { data: viewerData, error: viewerError } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('slack_user_id', slackId)
      .single()

    if (viewerError || !viewerData) {
      setError('ユーザーが見つかりません')
      setLoading(false)
      return
    }

    setViewer(viewerData)

    // roleに応じてメンバー取得
    let memberIds: string[] = []

    if (viewerData.role === 'admin') {
  // admin：自分以外の全メンバー取得
  const { data } = await supabase
    .from('team_members')
    .select('user_id')
    .neq('user_id', viewerData.id)
  memberIds = (data ?? []).map((d: { user_id: string }) => d.user_id)

    } else if (viewerData.role === 'manager') {
      // manager：manager_idが自分のメンバーのみ
      const { data } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('manager_id', viewerData.id)
      memberIds = (data ?? []).map((d: { user_id: string }) => d.user_id)

    } else {
      // member：ダッシュボード見られない
      setError('ダッシュボードの閲覧権限がありません')
      setLoading(false)
      return
    }

    if (memberIds.length === 0) {
      setMembers([])
      setLoading(false)
      return
    }

    // メンバーの基本情報取得
    const { data: usersData } = await supabase
      .from('users')
      .select('id, name, slack_user_id, role')
      .in('id', memberIds)

    // 直近4週のresponses取得
    const { data: responsesData } = await supabase
      .from('responses')
      .select('user_id, score_mind, score_body, free_text, answered_at')
      .in('user_id', memberIds)
      .order('answered_at', { ascending: false })

    // メンバーごとにデータ整形
    const formatted: Member[] = (usersData ?? []).map((u) => {
      const userResponses = (responsesData ?? [])
        .filter((r) => r.user_id === u.id)
        .slice(0, 4)

      const latest = userResponses[0]
      const mind = latest?.score_mind ?? null
      const body = latest?.score_body ?? null

      // アラート判定
      const alerts: string[] = []

      // 低スコア継続（2週連続 ≤2）
      if (
        userResponses.length >= 2 &&
        userResponses[0].score_mind <= 2 &&
        userResponses[1].score_mind <= 2
      ) alerts.push('低スコア継続')

      // 急落（先週比 -2以上）
      if (
        userResponses.length >= 2 &&
        userResponses[0].score_mind !== null &&
        userResponses[1].score_mind !== null &&
        userResponses[1].score_mind - userResponses[0].score_mind >= 2
      ) alerts.push('急落')

      // 未回答（2週連続）
      if (
        userResponses.length >= 2 &&
        userResponses[0].score_mind === null &&
        userResponses[1].score_mind === null
      ) alerts.push('未回答')

      // スコア固定（4週連続同スコア）
      if (
        userResponses.length >= 4 &&
        userResponses.every((r) => r.score_mind === userResponses[0].score_mind)
      ) alerts.push('スコア固定')

      const freeTexts = userResponses.map((r) => ({
        date: new Date(r.answered_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        text: r.free_text || '（記述なし）',
        alert: r.score_mind <= 2,
      }))

      return {
        id: u.id,
        name: u.name,
        slack_user_id: u.slack_user_id,
        role: u.role,
        mind,
        body,
        alerts,
        freeTexts,
      }
    })

    setMembers(formatted)
    setLoading(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500 text-sm">読み込み中...</p>
    </main>
  )

  if (error) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 text-sm">{error}</p>
    </main>
  )

  const alertMembers = members.filter((m) => m.alerts.length > 0)
  const avgMind = members.filter(m => m.mind !== null).reduce((s, m) => s + m.mind!, 0) / members.filter(m => m.mind !== null).length
  const avgBody = members.filter(m => m.body !== null).reduce((s, m) => s + m.body!, 0) / members.filter(m => m.body !== null).length
  const answerRate = Math.round((members.filter(m => m.mind !== null).length / members.length) * 100)

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">チームのげんき</h1>
          <p className="text-sm text-gray-500">{viewer?.name}さんのダッシュボード</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'こころ（平均）', value: isNaN(avgMind) ? '—' : avgMind.toFixed(1) },
          { label: 'からだ（平均）', value: isNaN(avgBody) ? '—' : avgBody.toFixed(1) },
          { label: '回答率', value: `${answerRate}%` },
          { label: '要対応', value: `${alertMembers.length}人`, red: true },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl p-3 ${m.red ? 'bg-red-50' : 'bg-white'} border border-gray-200`}>
            <p className={`text-xs ${m.red ? 'text-red-500' : 'text-gray-500'}`}>{m.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${m.red ? 'text-red-600' : 'text-gray-800'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alertMembers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">アラート</p>
          {alertMembers.map((member) => (
            <div key={member.id} className={`rounded-lg border p-3 mb-2 last:mb-0 ${alertBorderColor(member.alerts)}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${member.alerts.includes('低スコア継続') ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>
                  {member.name[0]}
                </div>
                <span className="text-sm font-medium text-gray-800">{member.name}</span>
                {member.alerts.map(a => (
                  <span key={a} className={`text-xs px-2 py-0.5 rounded-full font-medium ${alertColor(a)}`}>{a}</span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600 flex-1">{alertMessage(member.alerts[0])}</p>
                <select
                  className="text-xs border border-gray-300 rounded-full px-2 py-1 ml-3 bg-white"
                  value={statuses[member.id] || ''}
                  onChange={(e) => setStatuses({ ...statuses, [member.id]: e.target.value })}
                >
                  <option value="">未対応</option>
                  <option value="checked">確認済み</option>
                  <option value="talked">面談済み</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member list */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          メンバー一覧 <span className="text-xs text-gray-400 font-normal">— タップで記述履歴</span>
        </p>
        {members.length === 0 && (
          <p className="text-sm text-gray-400">メンバーがいません</p>
        )}
        {members.map((member) => (
          <div key={member.id}>
            <div
              className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-1"
              onClick={() => setOpenMember(openMember === member.id ? null : member.id)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${scoreColor(member.mind)}`}>
                {member.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{member.name}</span>
                  {member.alerts.map(a => (
                    <span key={a} className={`text-xs px-2 py-0.5 rounded-full font-medium ${alertColor(a)}`}>{a}</span>
                  ))}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColor(member.mind)}`}>
                    こころ {member.mind ?? '—'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColor(member.body)}`}>
                    からだ {member.body ?? '—'}
                  </span>
                </div>
                <div className="h-1 mt-1 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-1 rounded-full ${!member.mind ? 'bg-gray-300' : member.mind <= 2 ? 'bg-red-400' : member.mind === 3 ? 'bg-gray-400' : 'bg-green-400'}`}
                    style={{ width: member.mind ? `${(member.mind / 5) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{openMember === member.id ? '▴' : '▾'}</span>
            </div>

            {openMember === member.id && (
              <div className="bg-gray-50 rounded-lg p-3 mb-2">
                <p className="text-xs font-medium text-gray-500 mb-2">フリー記述（過去4週）</p>
                {member.freeTexts.length === 0 && (
                  <p className="text-xs text-gray-400">回答履歴がありません</p>
                )}
                {member.freeTexts.map((ft, i) => (
                  <div key={i} className={`border-l-2 pl-3 mb-2 last:mb-0 ${ft.alert ? 'border-red-400' : 'border-gray-300'}`}>
                    <p className="text-xs text-gray-400">{ft.date}</p>
                    <p className="text-sm text-gray-700">{ft.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">読み込み中...</p>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  )
}