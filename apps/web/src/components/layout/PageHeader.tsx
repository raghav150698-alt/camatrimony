import type { ReactNode } from "react";

export default function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="site-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="page-header-aside">{children}</div>}</header>;
}
