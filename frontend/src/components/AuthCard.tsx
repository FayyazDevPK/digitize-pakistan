import Link from "next/link";
import PixelD from "@/components/PixelD";

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[440px] flex flex-col gap-6">
        <Link href="/news" className="flex items-center gap-2.5 self-center">
          <PixelD size={8} />
          <div className="flex items-baseline gap-1.5 leading-none text-ink">
            <span className="font-bold text-xl tracking-tight">Digitize</span>
            <span className="font-display italic text-2xl text-muted">Pakistan</span>
          </div>
        </Link>
        <div className="bg-white border border-border rounded-[22px] p-7 md:p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl leading-none m-0">{title}</h1>
            {subtitle && <p className="text-[15px] text-muted m-0">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export const AUTH_INPUT =
  "h-12 bg-white border border-border-strong rounded-[11px] px-3.5 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-mint transition-shadow";
