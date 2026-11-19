interface Props {
  /** Heading level; pick the one that fits the page's outline. */
  as?: "h2" | "h3";
  /** Extra spacing for where it sits, e.g. `px-1`. */
  className?: string;
  children: React.ReactNode;
}

/** The small uppercase title above a group of cards or rows. */
export default function SectionHeading({ as: Tag = "h2", className = "", children }: Props) {
  return (
    <Tag className={`font-display font-bold text-xs uppercase tracking-widest text-muted ${className}`.trim()}>
      {children}
    </Tag>
  );
}
