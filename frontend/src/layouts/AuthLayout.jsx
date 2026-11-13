export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-brand-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
            <span className="text-xl font-bold tracking-tight">AP</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-brand-900">
            Attendance Portal
          </h1>
          <p className="mt-1 text-sm text-brand-500">
            Multi-University Management System
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border border-brand-200 bg-white p-8 shadow-xs">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-brand-400">
          Centralized Attendance Ecosystem &bull; Protected Access Only
        </p>
      </div>
    </div>
  );
}
