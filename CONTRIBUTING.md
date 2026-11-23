# 贡献 / Contributing

通过 [数据纠错](https://github.com/tageecc/coding-plan-rank/issues/new?template=data-correction.yml) 提供官方链接、套餐、地区及变化。请修改解析器，不要手改生成的 README。

```sh
npm ci
npm run update
npm run render
npm test
npm run render -- --check
```

`update` 抓取官方价格、额度及欧洲央行汇率，无需 API 密钥。新增厂商时添加适配器、原文样本、正常与异常输入测试。未公开数量保持 `null`，不能推算；补全次数不能代替 Agent 额度。主额度保存在 `quota`，其他同时生效的窗口写入 `caps`；五小时、周、月限制不能只写在说明文字里。固定30天窗口使用 `30d`，不能当作自然月。无五小时额度需要完整用量/FAQ 规则支持，不能根据定价页没写就在「5小时限额」列填「✅无」；动态限流单独标注。第三方亲自实测来源标 `kind: observation` 并记录原实测日期，表内保留「实测」前提，不能冒充官方全量政策。

所有价格保留原币数据；人民币展示由汇率模块统一计算。修改公式、市场范围或限制说明时，同时更新比较规则与测试。

第三方数量样本单独维护在 `data/usage-references.json`，不写回官方 `quota`/`caps`。记录来源、实测日期、模型、地区、套餐和测量方法；表内必须带「测」/「obs.」。`policy` 保存测量对应的套餐规则，规则变化后停止采用，人工复核后才能更新。每日抓取不改变实测日期，不按档位倍数扩展样本。

English: report corrections with official links. Add deterministic parsers and captured-source tests. Preserve original currencies and unknown quotas; CNY conversion uses the shared FX module. No API key is required.
