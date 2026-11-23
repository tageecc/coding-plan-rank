# 比较规则 / Methodology

[返回总表](../README.md)

## 价格

只列个人套餐的常规月付价，保留已核实的免费档。排除首月活动、年付折算、试用赠送、企业席位和加购额度。国内版与国际版分别列出。

全部月费统一显示为人民币：原价为人民币的直接展示，美元套餐按欧洲央行最新参考汇率换算；页尾展示参考汇率。欧洲央行分别公布美元、人民币对欧元的参考价，美元兑人民币 = 人民币参考价 ÷ 美元参考价。保留六位汇率精度，价格四舍五入至分。

机器人每日更新汇率；周末与假期使用最近交易日价格，README 标明汇率日期。换算值不是商家人民币报价，银行、支付渠道手续费及税费未计入。汇率抓取失败或已过期时暂停美元换算并显示待核验，不使用写死汇率。

按工具名称排列，同工具按原币月费递增。此排列不表示跨工具推荐顺序。

## 5小时限额与其他额度

「5小时限额」同时显示状态和数量：✅无表示无固定五小时窗口，不代表没有其他限流；❌2000AFP 等表示实际限额。确认有限额但未公布数量时写「❌未公布」，不只放一个叉。Claude 的「✅认证后无」保留身份前提，英文 ✅ID·None 表示完成身份验证后无此限额。Copilot 的动态速率限制显示「⚠️动态」，不擅自归为无此限额。新套餐必须补查用量文档、FAQ 和公告；没有依据时停止生成，不能自动补 ✅ 或问号。

判定周期优先看完整的用量与限流规则，而非定价卡片上是否提到五小时。阿里云、腾讯按当前 Token Plan 的月积分及 FAQ 规则归纳，不沿用旧 Coding Plan 的调用窗口；仍有动态速率及并发限制。Kiro FAQ 明确请求仅在所有积分耗尽时暂停。MiMo 发布公告明确无五小时 Token 限额。Antigravity 免费档的完整规则为每周，付费档为五小时及每周；Devin Free 使用桌面额度文档，Pro/Max 以现行 self-serve 计费规则为准。Cursor 将当前周用量帮助页与官方论坛工作人员关于小时限制的答复交叉核对。

五小时数量集中在「5小时限额」列，例如火山方舟 Small 显示「❌2000AFP」；右侧「其他额度」只列「每周7000AFP」「每月2万AFP」，不重复五小时数字。套餐、价格与五小时限额纵向合并，其他额度每个周期都是独立单元格，不依赖自动换行。所有同时生效的主要限额直接展示，有每日上限的也列出；未知数量写「未公布」，可能存在的限制写「可能另限」。

数字使用万、亿或 k、M、B 精确缩写，不显示千位分隔符，各行保留原单位，不进行跨平台换算。英文 💬 表示消息条数，~ 表示估算。相对倍数保留基准套餐，例如「每周5×Pro」。超高速、模型估算和窗口起点等详细说明可悬停查看。

官方未公布固定数量时写「未公开」，不填 0、无限量或根据价格猜倍数。关键访问限制直接标在套餐名：🖥️ 表示桌面限定，学生套餐以 🎓 显示，表示需要学生认证；完整条件保留在悬停提示中。各平台的积分、请求数和自定义倍数互不换算，不计算额度效率，也不以用量数量代替能力或综合性价比。

Codex 使用官方名称 Pro 100、Pro 200、Pro 500，与定价页和 Pro 帮助页交叉核对。Pro 200 用量高于 Pro 100，Pro 500 在三档中用量最高且包含超高速模式；固定数量未公开，不推算各档倍数。超高速会加快额度消耗。这里的 100、200、500 是官方档位名称，月费列仍统一显示人民币。

Codex 官方重置文档明确：Go 为月额度，Plus 为五小时及周额度，Pro 为周额度。Codex Free 的「✅实测无」仅对应 CodexBar 开发者在 2026-10-25 公开验证的一个账户：后端只返回固定 2,592,000 秒（30天）窗口。它不是所有免费账户的统一承诺，不能推广到其他灰度账户；30天也不等于自然月。该来源标为 observation，保留原实测日期，例行抓取不代表重新实测。

Codex Plus 显示 GPT-6.1 Sol 在标准速度下的消息预估范围，实际用量受模型、任务复杂度、上下文、推理和工具调用影响。其他模型可能有不同范围。Codex 免费及 Go 档按当前定价文档仅展示桌面应用中分批开放的受限访问，不包含 Codex Cloud。Pro 没有五小时限制，不代表没有所有使用限制；固定周额度未公开。

## 每日更新

每日北京时间 **09:23** 自动抓取价格、额度和汇率，重新生成中英文 README 并提交主干。GitHub 定时任务可能延迟。

只抓取公开资料，不执行远程脚本或让语言模型猜数值。官方规则与第三方亲自实测分开标注，第三方观测不能冒充官方承诺。遇到套餐消失、额度下降、规则或页面结构变化，保留原核验日期并标记待核验。官方原文摘录、原币价格与详细限制保留在 `data/` 中，变更可通过 Git 历史核对。README 使用工具、套餐、月费、5小时限额、其他额度五列，工具与套餐单元格纵向合并，每个额度周期逐行展示；单元格保持单行，桌面端检查满宽与无横向滚动。

## English

The table lists standard monthly individual plans and verified free access. All displayed prices are in CNY; USD prices use the latest ECB reference rates, rounded to two decimals. The rate's trading date is shown, including on weekends. Converted prices exclude payment fees and tax. Failed or stale FX verification suspends conversion.

Tools are ordered by name; tiers are ordered by original monthly price. Tool and plan cells span their applicable rows. The 5h cap column combines status with quantity: ✅None for no fixed five-hour window, ❌2kAFP for a known allowance, and ❌Unstated for a confirmed cap with an unpublished quantity. ✅ does not mean no other rate limits. Copilot shows ⚠️Dyn. (dynamic) because its current docs describe dynamic rate limits without a uniform five-hour window. New policies require research before rendering; missing evidence never defaults to ✅. ✅ID·None preserves the verification requirement. Codex Free says ✅obs.·None (observed): a CodexBar developer observed one Free account with only a fixed 30-day window on 2026-10-25, not a vendor guarantee for every account. The observation date is retained rather than advanced by daily page checks. Five-hour quantities appear only in 5h cap. Other caps puts weekly, monthly, fixed 30-day and daily allowances on separate rows. 💬 means messages and ~ marks an estimate. 🇨🇳 and 🌐 indicate China and Global; hover preserves the full market name. Unknown quantities stay undisclosed; missing documentation never implies unlimited usage. Relative allowances name their reference tier. Provider units are not interchangeable; no efficiency score is shown. Hover for model and reset details. Pro 100, Pro 200 and Pro 500 keep their official tier names. Fixed quantities are undisclosed. 🖥️ marks desktop-only access and 🎓 marks student verification, with full conditions in hover text. Codex Free/Go indicate limited desktop rollout, not cloud access; Plus message counts are model-specific estimates.

Daily deterministic parsers refresh official pricing, usage and exchange rates, and separately check the attributed primary account observation. Unsupported changes preserve the last verified timestamp and remain visibly unverified. Detailed evidence and original currencies are retained in data files.
