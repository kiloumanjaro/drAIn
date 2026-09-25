interface DateBadgeProps {
  month: string;
  day: string;
}

export default function DateBadge({ month, day }: DateBadgeProps) {
  return (
    <div className="flex w-12 flex-shrink-0 flex-col items-center justify-center rounded-md border border-[#dfdfdf] bg-white py-1.5">
      <span className="text-[10px] leading-none font-medium text-slate-400 uppercase">
        {month}
      </span>
      <span className="text-xl leading-tight font-bold text-blue-500">
        {day}
      </span>
    </div>
  );
}
