import { School, Users, TurkishLira, Clock, ShieldCheck, UserCheck, Activity } from 'lucide-react';

const items = [
  { icon: School, text: '500+ Schools' },
  { icon: Users, text: '50,000+ Students Managed' },
  { icon: TurkishLira, text: '৳10 Cr+ Fees Processed' },
  { icon: Clock, text: '99.9% Uptime' },
  { icon: ShieldCheck, text: 'Multi-tenant SaaS Architecture' },
  { icon: UserCheck, text: 'Role-Based Access Control' },
  { icon: Activity, text: 'Real-time Attendance Tracking' },
  { icon: School, text: 'Trusted by Schools Nationwide' },
];

export default function TrustBar() {
  return (
    <div className="border-y border-zinc-800/60 bg-zinc-900/40 py-4 overflow-hidden">
      <div className="flex gap-0 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        {/* Two copies for seamless loop */}
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 gap-0 animate-[marquee_28s_linear_infinite]"
          >
            {items.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-2.5 px-8 whitespace-nowrap text-sm text-zinc-400"
              >
                <Icon className="w-4 h-4 text-indigo-400 shrink-0" />
                {text}
                <span className="mx-2 text-zinc-700">·</span>
              </li>
            ))}
          </ul>
        ))}
      </div>

    </div>
  );
}
