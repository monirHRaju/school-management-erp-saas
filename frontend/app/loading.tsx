export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-[#E8471D]/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-[#E8471D] animate-spin" />
        </div>
        <span className="text-sm font-semibold text-[#0D1B2A] font-bengali">লোড হচ্ছে...</span>
      </div>
    </div>
  );
}
