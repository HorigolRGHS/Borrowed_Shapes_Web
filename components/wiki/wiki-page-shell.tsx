import type { ReactNode } from "react";

interface Props {
  header: ReactNode;
  body: ReactNode;
  infobox?: ReactNode;
  toc?: ReactNode;
}

export function WikiPageShell({ header, body, infobox, toc }: Props) {
  return (
    <div className="flex gap-8 pb-4">
      <div className="flex-1 min-w-0">
        {infobox && <div className="lg:hidden mb-6">{infobox}</div>}
        {header}
        {body}
      </div>
      {(infobox || toc) && (
        <aside className="hidden w-72 shrink-0 lg:block sticky top-24 self-start space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1">
          {infobox}
          {toc}
        </aside>
      )}
    </div>
  );
}
