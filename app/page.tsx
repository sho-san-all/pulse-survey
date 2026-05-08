import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold text-gray-800">げんきメーター</h1>
      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          マネージャーダッシュボード
        </Link>
      </div>
    </main>
  )
}