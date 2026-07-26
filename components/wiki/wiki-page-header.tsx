import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface ViewProps {
  mode: "view";
  title: string;
  summary?: string | null;
  byline?: ReactNode;
  isDraft?: boolean;
  draftLabel?: string;
}

interface EditProps {
  mode: "edit";
  titleNode: ReactNode;
  summaryNode: ReactNode;
  toolbarNode?: ReactNode;
  byline?: ReactNode;
}

type Props = ViewProps | EditProps;

export function WikiPageHeader(props: Props) {
  if (props.mode === "view") {
    return (
      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight break-words whitespace-pre-wrap">{props.title}</h1>
          {props.isDraft && (
            <Badge variant="secondary">{props.draftLabel ?? "Draft"}</Badge>
          )}
        </div>
        {props.summary && (
          <p className="text-base text-muted-foreground">{props.summary}</p>
        )}
        {props.byline && (
          <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{props.byline}</p>
        )}
      </header>
    );
  }
  return (
    <header className="mb-6 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">{props.titleNode}</div>
        {props.toolbarNode && <div className="shrink-0">{props.toolbarNode}</div>}
      </div>
      <div>{props.summaryNode}</div>
      {props.byline && (
        <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{props.byline}</p>
      )}
    </header>
  );
}
