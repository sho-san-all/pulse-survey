'use client'

import { useState } from 'react'

const mindEmojis = ['😫', '😟', '😐', '🙂', '😄']
const bodyEmojis = ['😔', '😓', '😐', '💪', '🏃']

export default function SurveyDemo() {
  const [mindScore, setMindScore] = useState<number | null>(null)
  const [bodyScore, setBodyScore] = useState<number | null>(null)
  const [freeText, setFreeText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit() {
    if (!mindScore || !bodyScore) {
      setError('① と ② を選んでから送信してください')
      return
    }
    setSubmitted(true)
    setError('')
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 w-full max-w-md">

        {/* Bot header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-lg">🤖</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Pulse Bot</p>
            <p className="text-xs text-gray-400">今日 13:00</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-gray-700 mb-5 leading-relaxed">
          こんにちは！今週のチェックインです 👋<br />
          <span className="text-gray-400 text-xs">1〜5でタップしてください（1=低い、5=高い）</span>
        </p>

        {/* Q1 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-3">
          <p className="text-sm font-medium text-gray-700 mb-3">① こころの調子</p>
          <div className="flex gap-2">
            {mindEmojis.map((emoji, i) => (
              <button
                key={i}
                onClick={() => setMindScore(i + 1)}
                className={`flex-1 py-2 text-lg rounded-lg border transition-all ${
                  mindScore === i + 1
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div>{emoji}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{i + 1}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Q2 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-3">
          <p className="text-sm font-medium text-gray-700 mb-3">② からだの調子</p>
          <div className="flex gap-2">
            {bodyEmojis.map((emoji, i) => (
              <button
                key={i}
                onClick={() => setBodyScore(i + 1)}
                className={`flex-1 py-2 text-lg rounded-lg border transition-all ${
                  bodyScore === i + 1
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div>{emoji}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{i + 1}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Q3 */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">③ 一言あれば（任意）</p>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="気になることや、伝えたいことがあれば..."
            className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none h-16 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-300"
          />
        </div>

        {/* Submit */}
        {!submitted ? (
          <>
            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
            >
              送信する
            </button>
            {error && <p className="text-xs text-gray-500 text-center mt-2">{error}</p>}
          </>
        ) : (
          <div className="text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-sm font-medium text-gray-700">送信完了！お疲れさまでした</p>
            <p className="text-xs text-gray-400 mt-1">回答ありがとうございます。来週もよろしくお願いします 🙏</p>
          </div>
        )}
      </div>
    </main>
  )
}