import { Spinner } from '@/components/Spinner';

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#F1E9DB] to-[#E5D9C3]">
      <Spinner />
      <p className="mt-4 text-[#8D6E63] font-medium">데이터를 불러오는 중...</p>
    </div>
  );
} 