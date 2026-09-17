import Image from "next/image";

import { MosqueIcon } from "./icons";

export function SidebarBrand({
  logoUrl,
  logoWidth,
  showTextLogo,
  appName,
  mosqueName,
  roleName,
}: {
  logoUrl: string | null;
  logoWidth?: number | null;
  showTextLogo?: boolean | null;
  appName?: string | null;
  mosqueName: string;
  roleName: string;
}) {
  const sizePx = (logoWidth ?? 6) * 4;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt="Logo"
            width={sizePx}
            height={sizePx}
            style={{ width: sizePx, height: sizePx }}
            className="object-contain"
            unoptimized
          />
        ) : (
          <MosqueIcon className="h-6 w-6 text-accent" />
        )}
        {(showTextLogo !== false) && (
          <span className="font-semibold tracking-tight">{appName ?? "Mekteb"}</span>
        )}
      </div>
      <div className="text-xs uppercase tracking-wide text-muted">
        {roleName}
      </div>
      <div className="font-semibold text-sm truncate">{mosqueName}</div>
    </div>
  );
}
