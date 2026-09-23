"use client";

import { Component, type ReactNode } from "react";

/* 一块面板出错，只该那一块换成一句话，不能整页变成错误页。
   之前一个 null 字段就让所有者的账号页整页打不开——Next 的全局错误边界接住了异常，
   代价是把整个页面都换掉。这里在每块面板外面再包一层。 */

type State = { message: string | null };

export class Boundary extends Component<{ name: string; children: ReactNode }, State> {
  state: State = { message: null };

  static getDerivedStateFromError(e: unknown): State {
    return { message: e instanceof Error ? e.message : String(e) };
  }

  render() {
    if (this.state.message !== null) {
      return (
        <div className="border border-destructive/40 p-4 text-sm">
          <p className="font-medium">{this.props.name}暂时无法显示。</p>
          <p className="text-muted-foreground">
            页面其余部分不受影响。刷新可重试；若持续出现，请通过账号页的联系表单反馈。
          </p>
          <p className="www-mono mt-2 text-xs text-muted-foreground">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
