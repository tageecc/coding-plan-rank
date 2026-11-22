# 比较规则 / Methodology

[返回总表](../README.md)

## 价格

只列个人套餐的常规月付价，保留已核实的免费档。排除首月活动、年付折算、试用赠送、企业席位和加购额度。国内版与国际版分别列出。

全部月费统一显示为人民币：原价为人民币的直接展示，美元套餐按欧洲央行最新参考汇率换算，标记「≈」。欧洲央行分别公布美元、人民币对欧元的参考价，美元兑人民币 = 人民币参考价 ÷ 美元参考价。保留六位汇率精度，价格四舍五入至分。

机器人每日更新汇率；周末与假期使用最近交易日价格，README 标明汇率日期。换算值不是商家人民币报价，银行、支付渠道手续费及税费未计入。汇率抓取失败或已过期时暂停美元换算并显示待核验，不使用写死汇率。

按工具名称排列，同工具按原币月费递增。此排列不表示跨工具推荐顺序。

## 5小时与周/月限额

五小时限额单独一列，周和月限额合在另一列并附周期，例如「7,000/周·2万/月」。有明确日限额的套餐同时显示日窗口。多个窗口同时生效，不能只展示其中最大的额度。数字使用万、亿或 K、M、B 缩写，保留原单位，不进行跨平台换算。同一行火山方舟的五小时及周/月限额均为 AFP，单位在五小时列标注一次；英文周期使用 w、m、d 分别表示周、月、日。

「有，未公开」表示官方确认存在五小时限制但没给定量；「未公开」表示当前官方资料未明确该窗口，不能当作无限量；「不限」只表示明确没有五小时窗口，周/月限制仍生效。「认证后不限」保留身份前提，「可能限额/周」保留官方不确定表述。相对倍数显示基准套餐，例如「5×Pro」表示 Pro 的五倍用量。超高速、模型估算和窗口起点等说明可悬停查看。

官方未公布固定数量时写「未公开」，不填 0、无限量或根据价格猜倍数。关键访问限制直接标在套餐名。各平台的积分、请求数和自定义倍数互不换算，不计算额度效率，也不以用量数量代替能力或综合性价比。

Codex 使用官方名称 Pro 100、Pro 200、Pro 500，与定价页和 Pro 帮助页交叉核对。Pro 200 用量高于 Pro 100，Pro 500 在三档中用量最高且包含超高速模式；固定数量未公开，不推算各档倍数。超高速会加快额度消耗。这里的 100、200、500 是官方档位名称，月费列仍统一显示人民币。

Codex Plus 显示 GPT-6.1 Sol 在标准速度下的消息预估范围，实际用量受模型、任务复杂度、上下文、推理和工具调用影响。其他模型可能有不同范围。Codex 免费及 Go 档按当前定价文档仅展示桌面应用中分批开放的受限访问，不包含 Codex Cloud。Pro 没有五小时限制，不代表没有所有使用限制；固定周额度未公开。

## 每日更新

每日北京时间 **09:23** 自动抓取价格、额度和汇率，重新生成中英文 README 并提交主干。GitHub 定时任务可能延迟。

不执行远程脚本或让语言模型猜数值。遇到套餐消失、额度下降、规则或页面结构变化，保留原核验日期并标记待核验。官方原文摘录、原币价格与详细限制保留在 `data/` 中，变更可通过 Git 历史核对。README 保持四列表格和单行单元格；桌面端检查满宽与无横向滚动。

## English

The table lists standard monthly individual plans and verified free access. All displayed prices are in CNY; USD prices use the latest ECB reference rates, rounded to two decimals. The rate's trading date is shown, including on weekends. Converted prices exclude payment fees and tax. Failed or stale FX verification suspends conversion.

Tools are ordered by name; tiers are ordered by original monthly price. Five-hour caps have a dedicated column; weekly/monthly caps share a second column with explicit periods. Multiple applicable windows are shown together, including published daily windows. Unknown, confirmed-but-undisclosed and explicitly unlimited caps remain distinct. Relative allowances name their reference tier. Provider units are not interchangeable; no efficiency score is shown. Key window caps are visible; hover for model and reset details. Pro 100, Pro 200 and Pro 500 keep their official tier names. Pro 200 has more usage than Pro 100; Pro 500 has the most and includes Ultrafast. Fixed quantities are undisclosed. Codex Free/Go indicate limited desktop rollout, not cloud access; Plus message counts are model-specific estimates.

Daily deterministic parsers refresh official pricing, usage and exchange rates. Unsupported changes preserve the last verified timestamp and remain visibly unverified. Detailed evidence and original currencies are retained in data files.
