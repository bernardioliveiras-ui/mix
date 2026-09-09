import { Sparkles } from "lucide-react";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-logo" aria-label="MIX10 PRO">
      <span className="brand-logo-mark" aria-hidden="true">
        <Sparkles size={compact ? 15 : 18} strokeWidth={2.4} />
      </span>
      <span className={compact ? "text-[1.05rem]" : "text-[1.25rem]"}>
        <b>MIX10</b> <em>PRO</em>
      </span>
    </span>
  );
}
