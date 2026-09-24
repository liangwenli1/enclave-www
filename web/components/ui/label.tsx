import * as React from "react";
import { cn } from "cn";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-[13.5px] leading-snug font-medium text-foreground", className)}
      {...props}
    />
  );
}

export { Label };
