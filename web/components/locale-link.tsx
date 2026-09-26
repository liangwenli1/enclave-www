"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useLocale } from "@/components/locale-provider";
import { localizePath } from "@/lib/i18n/locale";

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children: ReactNode;
  };

export function LocaleLink({ href, children, ...props }: Props) {
  const locale = useLocale();
  const localized = typeof href === "string" ? localizePath(href, locale) : href;
  return (
    <Link href={localized} {...props}>
      {children}
    </Link>
  );
}
