# 贡献 / Contributing

先提 [数据纠错](https://github.com/tageecc/coding-plan-rank/issues/new?template=data-correction.yml)，附官方链接、套餐、地区、币种和变化。请勿直接手改生成的 README。

```sh
npm ci
npm test
npm run update
npm run votes
npm run render
npm run render -- --check
```

`update` 从官方来源更新数据；`votes` 读取 GitHub 公开反应，本地复用 `gh auth` 或环境中的 `GH_TOKEN` / `GITHUB_TOKEN`。不必购买 API 或提供大模型密钥。纯解析与计票单元测试不需要联网或认证。

新增厂商：在 `scripts/parsers.mjs` 或 `scripts/parsers-extra.mjs` 添加来源与适配器，为官方原文格式、额度和异常输入补测试。数据结构见 `data/plans.json`。未知额度用 `null`，不填 0 或无限。

维护者运行 `npm run votes -- --init`，为缺少投票帖的工具创建 Issue。Issue 应保留 `community-vote` 标签和正文中的工具标识。CI 通过限定路径与已知 npm 命令更新，不执行远程文本。

欢迎代码 PR；自动更新只直接提交数据与生成文档。修改比较公式、市场范围或投票规则时，请同时更新 `docs/methodology.md` 和测试。

English: report corrections with official URLs, plan, region and currency. Edit parsers/data sources rather than generated READMEs. Add fixtures and failure tests for new providers. Unknown quotas must remain `null`. Voting uses GitHub reactions; no paid API or model secret is needed.
