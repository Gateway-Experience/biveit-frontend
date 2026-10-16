// Any line-art icon the landing page draws: lucide icons and our own hand-made ones share this shape.
export type ArtIcon = React.ComponentType<{
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}>;
