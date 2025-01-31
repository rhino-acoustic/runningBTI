'use client';

export function ErrorFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3] p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#004D40] mb-2">
          데이터를 불러오는데 실패했습니다
        </h1>
        <p className="text-[#8D6E63] mb-4">
          잠시 후 다시 시도해주세요
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#004D40] text-white rounded hover:bg-opacity-90 transition-colors"
        >
          새로고침
        </button>
      </div>
    </div>
  );
} 