# 设计规范

官网和工作台共用同一份规范，**只有一份**，在 enclave 仓库：

    enclave/DESIGN.md

这里以前放过一份拷贝，两边各改各的，很快就不一样了，所以删了。

官网这边只有规范的实现：`site/css/site.css` 顶部 `:root` 里的那组变量。
改颜色、字号、圆角、间距，只改那一处，并且要和 `enclave/src/styles.css` 的 `:root` 保持一致。
