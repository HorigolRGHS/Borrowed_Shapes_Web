import type { ReactNode } from "react";

interface Props {
  header: ReactNode;
  body: ReactNode;
  infobox?: ReactNode;
  toc?: ReactNode;
}

export function WikiPageShell({ header, body, infobox, toc }: Props) {
  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        {infobox && <div className="lg:hidden mb-6">{infobox}</div>}
        {header}
        {body}
      </div>
      {(infobox || toc) && (
        <aside className="hidden w-72 shrink-0 lg:block">
          {infobox && <div className="sticky top-24 space-y-4">{infobox}</div>}
          {toc && <div className="mt-4">{toc}</div>}
        </aside>
      )}
    </div>
  );
}
