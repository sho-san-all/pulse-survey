'use client'

import { useState } from 'react'

const members = [
  { id: 1, name: '田中 雄介', avatar: '田', mind: 2, body: 3, alerts: ['低スコア継続'], freeTexts: [
    { date: '5/1（今週）', text: '先週から仕事量が増えていて少しきつい', alert: true },
    { date: '4/24', text: 'なんとかやってます。少し疲れ気味です', alert: true },
    { date: '4/17', text: '特になし', alert: false },
    { date: '4/10', text: '新しいプロジェクトで忙しいですが楽しいです', alert: false },
  ]},
  { id: 2, name: '中村 拓也', avatar: '中', mind: 2, body: 4, alerts: ['急落'], freeTexts: [
    { date: '5/1（今週）', text: '（記述なし）', alert: true },
    { date: '4/24', text: '順調です', alert: false },
    { date: '4/17', text: '特になし', alert: false },
    { date: '4/10', text: 'チームで協力できていい感じです', alert: false },
  ]},
  { id: 3, name: '伊藤 さくら', avatar: '伊', mind: null, body: null, alerts: ['未回答'], freeTexts: [
    { date: '5/1（今週）', text: '（未回答）', alert: false },
    { date: '4/24', text: '（未回答）', alert: false },
    { date: '4/17', text: '少し余裕が出てきました', alert: false },
    { date: '4/10', text: 'バタバタしています', alert: false },
  ]},
  { id: 4, name: '山本 彩', avatar: '山', mind: 3, body: 3, alerts: ['スコア固定'], freeTexts: [
    { date: '5/1（今週）', text: '今週は体調が戻ってきました', alert: false },
    { date: '4/24', text: '風邪気味でした', alert: false },
    { date: '4/17', text: '（記述なし）', alert: false },
    { date: '4/10', text: '特になし', alert: false },
  ]},
  { id: 5, name: '佐藤 健', avatar: '佐', mind: 5, body: 4, alerts: [], freeTexts: [
    { date: '5/1（今週）', text: '（記述なし）', alert: false },
    { date: '4/24', text: 'チームの雰囲気がよくて助かっています', alert: false },
    { date: '4/17', text: '（記述なし）', alert: false },
    { date: '4/10', text: '（記述なし）', alert: false },
  ]},
  { id: 6, name: '鈴木 美咲', avatar: '鈴', mind: 4, body: 5, alerts: [], freeTexts: [
    { date: '5/1（今週）', text: '（記述なし）', alert: false },
    { date: '4/24', text: '来週の発表に向けて準備中です！', alert: false },
    { date: '4/17', text: '（記述なし）', alert: false },
    { date: '4/10', text: '少し忙しかったですが問題なしです', alert: false },
  ]},
]

const alertMembers = members.filter(m => m.alerts.length > 0)

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

function alertMessage(alert: string, member: typeof members[0]) {
  if (alert === '低スコア継続') return `こころの調子が2以下を2週連続 — 声かけを検討してください`
  if (alert === '急落') return `こころの調子が急落（先週比-3）— 何かあったか確認を`
  if (alert === '未回答') return `2週連続未回答 — 状況を確認してみましょう`
  if (alert === 'スコア固定') return `4週連続「3」 — 本音が出にくい可能性があります`
  return ''
}

export default function Dashboard() {
  const [openMember, setOpenMember] = useState<number | null>(null)
  const [statuses, setStatuses] = useState<Record<number, string>>({})

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">チームのげんき</h1>
          <p className="text-sm text-gray-500">2025年5月1日（木）時点</p>
        </div>
        <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600">
          <option>直近4週</option>
          <option>直近8週</option>
          <option>直近3ヶ月</option>
        </select>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'こころ（平均）', value: '3.4' },
          { label: 'からだ（平均）', value: '3.7' },
          { label: '回答率', value: '75%' },
          { label: '要対応', value: `${alertMembers.length}人`, red: true },
        ].map((m) => (
          <div key={m.label} className={`rounded-xl p-3 ${m.red ? 'bg-red-50' : 'bg-white'} border border-gray-200`}>
            <p className={`text-xs ${m.red ? 'text-red-500' : 'text-gray-500'}`}>{m.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${m.red ? 'text-red-600' : 'text-gray-800'}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">アラート</p>
        {alertMembers.map((member) => (
          <div key={member.id} className={`rounded-lg border p-3 mb-2 last:mb-0 ${alertBorderColor(member.alerts)}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${member.alerts.includes('低スコア継続') ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>
                {member.avatar}
              </div>
              <span className="text-sm font-medium text-gray-800">{member.name}</span>
              {member.alerts.map(a => (
                <span key={a} className={`text-xs px-2 py-0.5 rounded-full font-medium ${alertColor(a)}`}>{a}</span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 flex-1">{alertMessage(member.alerts[0], member)}</p>
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

      {/* Member list */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-gray-700 mb-3">
          メンバー一覧 <span className="text-xs text-gray-400 font-normal">— タップで記述履歴</span>
        </p>
        {members.map((member) => (
          <div key={member.id}>
            <div
              className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 rounded-lg px-1"
              onClick={() => setOpenMember(openMember === member.id ? null : member.id)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${scoreColor(member.mind)}`}>
                {member.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
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
                    className={`h-1 rounded-full ${member.mind === null ? 'bg-gray-300' : member.mind <= 2 ? 'bg-red-400' : member.mind === 3 ? 'bg-gray-400' : 'bg-green-400'}`}
                    style={{ width: member.mind ? `${(member.mind / 5) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{openMember === member.id ? '▴' : '▾'}</span>
            </div>

            {openMember === member.id && (
              <div className="bg-gray-50 rounded-lg p-3 mb-2">
                <p className="text-xs font-medium text-gray-500 mb-2">フリー記述（過去4週）</p>
                {member.freeTexts.map((ft) => (
                  <div key={ft.date} className={`border-l-2 pl-3 mb-2 last:mb-0 ${ft.alert ? 'border-red-400' : 'border-gray-300'}`}>
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