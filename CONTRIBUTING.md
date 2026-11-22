# 贡献 / Contributing

通过 [数据纠错](https://github.com/tageecc/coding-plan-rank/issues/new?template=data-correction.yml) 提供官方链接、套餐、地区及变化。请修改解析器，不要手改生成的 README。

```sh
npm ci
npm run update
npm run render
npm test
npm run render -- --check
```

`update` 抓取官方价格、额度及欧洲央行汇率，无需 API 密钥。新增厂商时添加适配器、原文样本、正常与异常输入测试。未公开数量保持 `null`，不能推算；补全次数不能代替 Agent 额度。

所有价格保留原币数据；人民币展示由汇率模块统一计算。修改公式、市场范围或限制说明时，同时更新比较规则与测试。

English: report corrections with official links. Add deterministic parsers and captured-source tests. Preserve original currencies and unknown quotas; CNY conversion uses the shared FX module. No API key is required.
