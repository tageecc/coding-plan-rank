# 比较规则 / Methodology

[返回总表](../README.md)

## 价格

只列个人套餐的常规月付价，保留已核实的免费档。排除首月活动、年付折算、试用赠送、企业席位和加购额度。国内版与国际版分别列出。

全部月费统一显示为人民币：原价为人民币的直接展示，美元套餐按欧洲央行最新参考汇率换算；页尾展示参考汇率。欧洲央行分别公布美元、人民币对欧元的参考价，美元兑人民币 = 人民币参考价 ÷ 美元参考价。保留六位汇率精度，价格四舍五入至分。

机器人每日更新汇率；周末与假期使用最近交易日价格，README 标明汇率日期。换算值不是商家人民币报价，银行、支付渠道手续费及税费未计入。汇率抓取失败或已过期时暂停美元换算并显示待核验，不使用写死汇率。

按工具名称排列，同工具按原币月费递增。此排列不表示跨工具推荐顺序。

## 5小时限制与用量

5小时列只表达是否有限制：✅ 确认有、❌ 确认无、❓ 官方未说明是否有。已确认存在窗口但数量没公布的仍是 ✅，不能把「是否有限制」和「额度是多少」混为一谈。❌认证后保留身份前提；英文 w/ID 表示完成身份验证后。

用量列按重置周期逐行展示，例如同一套餐依次显示「5小时 2,000AFP」「每周 7,000AFP」「每月 2万AFP」。套餐、价格与状态纵向合并，每个周期都是独立单元格，不依赖自动换行。所有同时生效的主要限额直接展示，有每日上限的也列出；未知数量写「未公布」，可能存在的限制写「可能另限」。

数字使用万、亿或 k、M、B 精确缩写，各行保留原单位，不进行跨平台换算。相对倍数保留基准套餐，例如「每周 5×Pro」。超高速、模型估算和窗口起点等详细说明可悬停查看。

官方未公布固定数量时写「未公开」，不填 0、无限量或根据价格猜倍数。关键访问限制直接标在套餐名。各平台的积分、请求数和自定义倍数互不换算，不计算额度效率，也不以用量数量代替能力或综合性价比。

Codex 使用官方名称 Pro 100、Pro 200、Pro 500，与定价页和 Pro 帮助页交叉核对。Pro 200 用量高于 Pro 100，Pro 500 在三档中用量最高且包含超高速模式；固定数量未公开，不推算各档倍数。超高速会加快额度消耗。这里的 100、200、500 是官方档位名称，月费列仍统一显示人民币。

Codex Plus 显示 GPT-6.1 Sol 在标准速度下的消息预估范围，实际用量受模型、任务复杂度、上下文、推理和工具调用影响。其他模型可能有不同范围。Codex 免费及 Go 档按当前定价文档仅展示桌面应用中分批开放的受限访问，不包含 Codex Cloud。Pro 没有五小时限制，不代表没有所有使用限制；固定周额度未公开。

## 每日更新

每日北京时间 **09:23** 自动抓取价格、额度和汇率，重新生成中英文 README 并提交主干。GitHub 定时任务可能延迟。

不执行远程脚本或让语言模型猜数值。遇到套餐消失、额度下降、规则或页面结构变化，保留原核验日期并标记待核验。官方原文摘录、原币价格与详细限制保留在 `data/` 中，变更可通过 Git 历史核对。README 使用工具、套餐、月费、5小时限制、用量五列，工具与套餐单元格纵向合并，每个额度周期逐行展示；单元格保持单行，桌面端检查满宽与无横向滚动。

## English

The table lists standard monthly individual plans and verified free access. All displayed prices are in CNY; USD prices use the latest ECB reference rates, rounded to two decimals. The rate's trading date is shown, including on weekends. Converted prices exclude payment fees and tax. Failed or stale FX verification suspends conversion.

Tools are ordered by name; tiers are ordered by original monthly price. Tool and plan cells span their applicable rows. The five-hour column shows ✅ for a confirmed cap, ❌ for a confirmed absence, and ❓ when the official docs do not say; w/ID preserves the verification requirement. The allowance column puts each reset period on its own row, including numeric five-hour allowances and weekly, monthly or daily caps. Unknown quantities stay undisclosed; missing documentation never implies unlimited usage. Relative allowances name their reference tier. Provider units are not interchangeable; no efficiency score is shown. Hover for model and reset details. Pro 100, Pro 200 and Pro 500 keep their official tier names. Fixed quantities are undisclosed. Codex Free/Go indicate limited desktop rollout, not cloud access; Plus message counts are model-specific estimates.

Daily deterministic parsers refresh official pricing, usage and exchange rates. Unsupported changes preserve the last verified timestamp and remain visibly unverified. Detailed evidence and original currencies are retained in data files.
