# 比较规则 / Methodology

[返回排行](../README.md)

## 月费

- 只列个人月付套餐的常规价格；工具按社区票数分组，同工具内按月费排列。免费档也在总表中。
- 同一张表用 $ 和 ¥ 区分美元与人民币，不使用浮动汇率跨市场排序。
- 不把首月优惠、试用、年付折算、企业席位或另购额度当作标准月费。价格可能另计税费。
- 国外版与国内版是不同产品/市场，不能互换价格或额度。
- 总表采用单行单元格与简短名称，优先保证电脑端无横向滚动；全称、官方链接和限制保留在同页。GitHub 控制页面样式，手机窄屏可能滚动。英文额度中的 cr、msg、req 分别为积分、消息、请求，wk/mo 分别为周/月。

## 性价比

同一组必须满足：**同厂商 + 同币种 + 同额度单位 + 同刷新周期**。

```text
额度效率 = 官方公开额度 / 标准月费
相对性价比 = 当前档额度效率 / 该组最低月费档的额度效率
```

例如基础档 $10 / 月、100 credits / 月；高档 $20 / 月、300 credits / 月。高档效率为基础档的 **1.50×**。

- 不同厂商的 credit、请求、Token 和「基础档倍数」不是统一单位，不做跨厂商绝对排名。
- 只用官方公开的定量额度。同一厂商的倍数必须明示基准；不把「更多」「动态限制」理解为无限量。
- 多个限额同时生效时，按选定的主周期计算，其他限制写在同一 README 的来源注释中。倍率不能解释成全天持续满额输出。
- 消息估计区间不作为固定限额，不参与效率计算。
- 同效率并列；没有可比数据的不入榜；抓取失败或待核验的厂商不参与价格和性价比排行。
- 相对性价比是额度效率，**不是模型能力、速度、可用性或综合推荐分数**。不同厂商的 1.50× 也不能互比。

## 社区票选

总表显示票数和 👍 支持链接，直接定位到简短的投票正文。每个工具有一个带 `community-vote` 标签的 Issue，用户对 **Issue 正文**添加 👍（GitHub API 的 `+1`）即可投票。GitHub Markdown 自身不能提交交互投票。

- 每个真人 GitHub 账号对每个工具计一票，可以支持多个工具。这是多选支持票，不是强制单选。
- 同一账号去重，不计机器人、其他表情、评论点赞和评论数量。撤回反应后，下次同步减票。
- 同票并列，零票不产生名次。同步失败保留历史数据并显示「待同步」，不把失败当成零票。
- 每日抓取完整分页；可手动运行 Actions 立即同步。计票时间见 README。
- 不收集或保存投票人名单，仅保存公开 Issue 编号、票数和同步时间。
- 公开反应无法彻底防止小号刷票；票数仅代表参与者偏好，与官方额度性价比独立。

## 每日更新

每日北京时间 **09:23**（01:23 UTC）触发 GitHub Actions。GitHub 的计划任务可能延迟；长期无活动的公开仓库可能被 GitHub 暂停计划任务，请检查 Actions。

1. 从配置中的官方地址抓取，限制超时、响应体积和跳转目标。
2. 用各厂商适配器提取价格与额度，不执行远程内容，不依赖语言模型猜数值。
3. 验证格式、必要套餐、价格和额度。无法确认的变化标记 `needs-review` 或 `unavailable`，保留上次核验值与日期。
4. 统计 GitHub 票数，生成各自完整的中英文 README 总表；变更提交到主干。
5. 失败状态与原始事实摘录公开，可通过 Actions 和 Git 记录追溯。

解析器有意只接收已知、可验证的结构。新套餐、新计费方式或无法确定的条款需要修改适配器；**每日检查不等于所有未知规则都能自动理解**。

## English

Standard monthly individual prices only. USD and CNY are ranked separately. Promotions, annualized rates and unverified measurements are excluded. Domestic and international products are distinct markets.

Quota efficiency compares only the same provider, currency, unit and reset window. Divide published quota by monthly price, then normalize against the cheapest comparable tier. Unknown and estimated-range allowances remain unranked. Additional caps and shared pools are documented separately. Ratios do not measure model quality and are not comparable across providers.

Community ranking counts unique human accounts' `+1` reactions on the designated issue body. Multiple tools may receive a user's support; removed reactions are removed on the next sync. Ties share ranks, zero votes have no rank, and failed syncs remain visibly pending. Public reactions cannot fully prevent manipulation.

Daily GitHub Actions refreshes use deterministic parsers and official sources. Unknown billing formats require adapter maintenance. Failed verification retains historical data and its original verification timestamp. Scheduled jobs can be delayed or disabled by GitHub after repository inactivity.
