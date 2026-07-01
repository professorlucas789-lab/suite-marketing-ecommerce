export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">PreçoCerto</h1>
          <p className="text-slate-600">Precificação inteligente de produtos</p>
        </div>
        {children}
      </div>
    </div>
  )
}
