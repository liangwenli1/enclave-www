import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "cn";
import { fieldClass } from "@/components/ui/input";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size">;

/** 原生 select：键盘、读屏、手机上的滚轮都是系统自带的。className 作用在外层，用来控制宽度。 */
function NativeSelect({ className, ...props }: NativeSelectProps) {
  return (
    <div
      data-slot="native-select-wrapper"
      className={cn("relative w-fit has-[select:disabled]:opacity-60", className)}
    >
      <select
        data-slot="native-select"
        className={cn(fieldClass, "h-10 cursor-pointer appearance-none pr-9 pl-3")}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
