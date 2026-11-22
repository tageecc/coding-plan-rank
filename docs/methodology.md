# 比较规则 / Methodology

[返回总表](../README.md)

## 价格

只列个人套餐的常规月付价，保留已核实的免费档。排除首月活动、年付折算、试用赠送、企业席位和加购额度。国内版与国际版分别列出。

全部月费统一显示为人民币：原价为人民币的直接展示，美元套餐按欧洲央行最新参考汇率换算，标记「≈」。欧洲央行分别公布美元、人民币对欧元的参考价，美元兑人民币 = 人民币参考价 ÷ 美元参考价。保留六位汇率精度，价格四舍五入至分。

机器人每日更新汇率；周末与假期使用最近交易日价格，README 标明汇率日期。换算值不是商家人民币报价，银行、支付渠道手续费及税费未计入。汇率抓取失败或已过期时暂停美元换算并显示待核验，不使用写死汇率。

按工具名称排列，同工具按原币月费递增。此排列不表示跨工具推荐顺序。

## 额度与效率

只使用官方公开的额度、单位和刷新周期。官方未公布固定数量时写「未公开」，不填 0、无限量或根据价格猜出的倍数。免费访问、限模型、分批开放和身份要求不等于完整付费权限；关键访问限制直接标在套餐名，详细条款可悬停额度查看。

额度效率只比较**同工具、同市场、同币种、同额度单位、同周期**的套餐：

```text
额度效率 = (该套餐额度 / 月费) / (最低付费档额度 / 月费)
```

基础档为 1×，粗体为本组最优，— 表示无法比较。免费档、估算区间和未公开数量不计算效率。统一汇率不会改变同组的效率。

积分、请求数与各工具自定义倍数互不换算。效率不是模型能力、质量、速度或综合推荐分。不同工具的 1.50× 不可直接比较。多个限额可同时生效；月额度不代表能持续满速使用。

Codex Plus 显示 GPT-6.1 Sol 在标准速度下的消息预估范围，实际用量受模型、任务复杂度、上下文、推理和工具调用影响。其他模型可能有不同范围。Codex 免费及 Go 档按当前定价文档仅展示桌面应用中分批开放的受限访问，不包含 Codex Cloud。Pro 没有五小时限制，不代表没有所有使用限制；固定周额度未公开。

## 每日更新

每日北京时间 **09:23** 自动抓取价格、额度和汇率，重新生成中英文 README 并提交主干。GitHub 定时任务可能延迟。

不执行远程脚本或让语言模型猜数值。遇到套餐消失、额度下降、规则或页面结构变化，保留原核验日期并标记待核验，不参与效率计算。官方原文摘录、原币价格与详细限制保留在 `data/` 中，变更可通过 Git 历史核对。README 保持四列表格和单行单元格；桌面端检查满宽与无横向滚动。

## English

The table lists standard monthly individual plans and verified free access. All displayed prices are in CNY; USD prices use the latest ECB reference rates, rounded to two decimals. The rate's trading date is shown, including on weekends. Converted prices exclude payment fees and tax. Failed or stale FX verification suspends conversion.

Tools are ordered by name; tiers are ordered by original monthly price. Quota value compares only tiers within the same tool, market, currency, unit and reset window. Unknown quantities, free plans and estimated ranges are unranked. It is not a cross-provider quality ranking. Hover over allowances for restrictions. Codex Free/Go indicate limited desktop rollout, not cloud access; Plus message counts are model-specific estimates.

Daily deterministic parsers refresh official pricing, usage and exchange rates. Unsupported changes preserve the last verified timestamp and remain visibly unverified. Detailed evidence and original currencies are retained in data files.
