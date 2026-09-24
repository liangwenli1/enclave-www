import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/*
 * 按钮：胶囊形。每一屏只放一个 default（钴蓝实心），其余用 outline / ghost / link。
 * inverse 只用在海军蓝区块上。
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap no-underline transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        outline: "border border-input bg-background text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#e3e9f4]",
        ghost: "text-body hover:bg-accent hover:text-foreground",
        destructive:
          "border border-destructive/35 bg-background text-destructive hover:bg-destructive/5",
        inverse: "bg-white text-navy hover:bg-[#e3e9f6]",
        link: "rounded-none text-link underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3.5 text-[13px]",
        default: "h-10 px-[18px] text-[14.5px]",
        lg: "h-12 px-[26px] text-base",
        icon: "size-10",
      },
    },
    // 链接样式的按钮夹在表格和句子里，不能带按钮的高度和内边距。
    compoundVariants: [
      { variant: "link", size: ["sm", "default", "lg"], className: "h-auto px-0" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
