// Text — typography hierarchy primitive. Variants map to the NGW type
// scale + the locked text-color roles (secondary = steel, etc.).
import { color, type } from '../tokens';

const VARIANTS = {
  title:     { size: type.size['3xl'], weight: type.weight.semibold, color: color.text.primary,   leading: type.leading.tight },
  heading:   { size: type.size.xl,    weight: type.weight.semibold, color: color.text.primary,   leading: type.leading.tight },
  body:      { size: type.size.md,    weight: type.weight.regular,  color: color.text.primary,   leading: type.leading.normal },
  bodyStrong:{ size: type.size.md,    weight: type.weight.semibold, color: color.text.primary,   leading: type.leading.normal },
  secondary: { size: type.size.base,  weight: type.weight.regular,  color: color.text.secondary, leading: type.leading.normal },
  caption:   { size: type.size.sm,    weight: type.weight.regular,  color: color.text.tertiary,  leading: type.leading.normal },
  label:     { size: type.size.sm,    weight: type.weight.semibold, color: color.text.secondary, leading: type.leading.normal, tracking: type.tracking.label },
};

export default function Text({ variant = 'body', as: Tag = 'span', color: colorOverride, style = {}, children, ...rest }) {
  const v = VARIANTS[variant] || VARIANTS.body;
  return (
    <Tag
      style={{
        fontFamily: type.family,
        fontSize: v.size,
        fontWeight: v.weight,
        lineHeight: v.leading,
        letterSpacing: v.tracking || type.tracking.normal,
        color: colorOverride || v.color,
        margin: 0,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
