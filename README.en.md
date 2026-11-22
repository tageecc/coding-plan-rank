# AI Coding Agent Plan Rankings

Official prices and quotas, checked daily. Separate rankings for price, quota value and community preference.

Compare Claude Code, Codex, Cursor, GitHub Copilot, Google Antigravity, GLM, MiniMax and Kimi.

[中文](README.md) · [English](README.en.md) · [Methodology](docs/methodology.md) · [Changes](docs/changes.md) · [Data](data/plans.json)

Refresh scheduled daily at 01:23 UTC; last run: **2026-11-22** (Asia/Shanghai). Each provider has its own verification date.

Individual plans at standard monthly prices. USD and CNY stay separate. No first-month deals, annualized rates or inferred quotas.

## Starting monthly price

Sorted by each tool’s cheapest verified paid tier; free tiers appear in plan details.

### USD

| Tool | From / mo | Plans |
| :-- | --: | :-- |
| Codex | $8 | [Go](#codex) |
| Cursor | $8 | [Plus](#cursor) |
| GitHub Copilot | $10 | [Pro](#copilot) |
| GLM Coding Plan | $18 | [Lite](#glm) |
| Kimi Code | $19 | [Plus](#kimi) |
| Google Antigravity | $19.99 | [Google AI Pro](#antigravity) |
| Claude Code | $20 | [Pro](#claude) |
| Devin / Windsurf | $20 | [Pro](#devin) |
| Kiro | $20 | [Pro](#kiro) |
| MiniMax M Plan | $22 | [Go](#minimax) |

### CNY

| Tool | From / mo | Plans |
| :-- | --: | :-- |
| MiniMax M Plan 中国版 | ¥49 | [Go](#minimax-cn) |

## Quota value

Compare only within a provider, quota unit, reset window and currency. The cheapest tier is 1×; efficiency is published quota divided by monthly price. Unknown allowances stay unranked.

| Tool | Best quota value | Relative value |
| :-- | :-- | --: |
| [Cursor](#cursor) | Ultra | 2.00× |
| [Claude Code](#claude) | All tiers tie | 1.00× |
| [GitHub Copilot](#copilot) | Max | 1.33× |
| [GLM Coding Plan](#glm) | Max | 1.50× |
| [MiniMax M Plan](#minimax) | Build | 1.25× |
| [MiniMax M Plan 中国版](#minimax-cn) | Build | 1.25× |
| [Kiro](#kiro) | All tiers tie | 1.00× |

Do not compare ratios across rows. Ratios do not measure model quality. See provider details for shared pools, additional caps and extra charges.

## Community votes

Open a tool’s issue and react to the **issue body** with 👍. One vote per human account per tool; multiple tools allowed. Removing the reaction removes the vote on the next daily sync.

| Rank | Tool / vote | Votes |
| --: | :-- | --: |
| — | [Claude Code](https://github.com/tageecc/coding-plan-rank/issues/2) | 0 |
| — | [Codex](https://github.com/tageecc/coding-plan-rank/issues/3) | 0 |
| — | [Cursor](https://github.com/tageecc/coding-plan-rank/issues/1) | 0 |
| — | [Devin / Windsurf](https://github.com/tageecc/coding-plan-rank/issues/6) | 0 |
| — | [GitHub Copilot](https://github.com/tageecc/coding-plan-rank/issues/4) | 0 |
| — | [GLM Coding Plan](https://github.com/tageecc/coding-plan-rank/issues/7) | 0 |
| — | [Google Antigravity](https://github.com/tageecc/coding-plan-rank/issues/5) | 0 |
| — | [Kimi Code](https://github.com/tageecc/coding-plan-rank/issues/10) | 0 |
| — | [Kiro](https://github.com/tageecc/coding-plan-rank/issues/11) | 0 |
| — | [MiniMax M Plan](https://github.com/tageecc/coding-plan-rank/issues/8) | 0 |
| — | [MiniMax M Plan 中国版](https://github.com/tageecc/coding-plan-rank/issues/9) | 0 |

No valid votes yet; no winners are assigned.
Last vote sync: 2026-11-22. Bot accounts, comment reactions and other emoji do not count. Public voting cannot fully prevent manipulation.

## Plan details

Expand one tool at a time. Each table has three columns; quota units retain their official meaning.

<a id="cursor"></a>
<details>
<summary><strong>Cursor</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Free | $0 | Undisclosed |
| Plus | $8 | 1× base / week |
| Premium | $30 | 4× base / week |
| Super | $100 | 15× base / week |
| Ultra | $200 | 50× base / week |

**Plus:** Plus = 1×; weekly allowance shared by Cursor and Grok. Third-party models and Grok API billed separately.

[Official source](https://cursor.com/pricing) · [Limits & billing notes](docs/providers/cursor.md)

</details>

<a id="claude"></a>
<details>
<summary><strong>Claude Code</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Pro | $20 | 1× base / week |
| Max | $100 | 5× base / week |
| Ultra | $200 | 10× base / week |

**Pro:** Pro = 1×; weekly allowance shared by Claude and Claude Code. Five-hour limits also apply.

[Official source](https://claude.com/pricing) · [Limits & billing notes](docs/providers/claude.md)

</details>

<a id="codex"></a>
<details>
<summary><strong>Codex</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Free | $0 | Undisclosed |
| Go | $8 | Undisclosed |
| Plus | $20 | Est. 15–160 messages / 5h |
| Pro $100 | $100 | Undisclosed |
| Pro $200 | $200 | Undisclosed |
| Pro $500 | $500 | Undisclosed |

**Go:** Limited to GPT-6 Luna at Standard speed in the desktop app, subject to rollout; no fixed allowance published. Does not include full Plus access.

[Official source](https://learn.chatgpt.com/docs/pricing.md) · [Limits & billing notes](docs/providers/codex.md)

</details>

<a id="copilot"></a>
<details>
<summary><strong>GitHub Copilot</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Student | $0 | Undisclosed |
| Free | $0 | Undisclosed |
| Pro | $10 | 1,500 credits / month |
| Pro+ | $39 | 7,000 credits / month |
| Max | $100 | 20,000 credits / month |

**Pro:** Total monthly GitHub AI Credits, including Base and Flex; consumption varies by model.

[Official source](https://docs.github.com/api/article/body?pathname=/en/copilot/get-started/plans) · [Limits & billing notes](docs/providers/copilot.md)

</details>

<a id="antigravity"></a>
<details>
<summary><strong>Google Antigravity</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Google AI Pro | $19.99 | Undisclosed |
| Google AI Ultra 5x | $99.99 | Undisclosed |
| Google AI Ultra 20x | $199.99 | Undisclosed |

**Google AI Pro:** Refreshes every five hours with a weekly cap; fixed quantity undisclosed and consumption depends on work. Tier names do not establish coding-quota multiples.

[Official source](https://gemini.google/us/subscriptions/) · [Limits & billing notes](docs/providers/antigravity.md)

</details>

<a id="devin"></a>
<details>
<summary><strong>Devin / Windsurf</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Pro | $20 | Undisclosed |
| Max | $200 | Undisclosed |

**Pro:** Calendar-week and calendar-day allowances; quantities and timezone undisclosed. Shared across Desktop, CLI and cloud; overages cost extra.

[Official source](https://devin.ai/pricing) · [Limits & billing notes](docs/providers/devin.md)

</details>

<a id="glm"></a>
<details>
<summary><strong>GLM Coding Plan</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Lite | $18 | 10,000 credits / week |
| Pro | $80 | 60,000 credits / week |
| Max | $168 | 140,000 credits / week |

**Lite:** Regular list price; also capped at 2,000 credits per five hours. Weekly credits reset every seven days from subscription; model/cache-dependent, not requests. Off-peak discounts excluded from allowance.

[Official source](https://zcode.z.ai/en) · [Limits & billing notes](docs/providers/glm.md)

</details>

<a id="minimax"></a>
<details>
<summary><strong>MiniMax M Plan</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Go | $22 | 1× base / week |
| Explore | $55 | 3× base / week |
| Build | $132 | 7.5× base / week |

**Go:** Published regular monthly price; first-month offer ended. Regional Go = 1×; shared weekly allowance across models/tools with a five-hour window too. Windows start on first use; next use after expiry starts a new window.

[Official source](https://platform.minimax.io/docs/m-plan/monthly-offer) · [Limits & billing notes](docs/providers/minimax.md)

</details>

<a id="minimax-cn"></a>
<details>
<summary><strong>MiniMax M Plan 中国版</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Go | ¥49 | 1× base / week |
| Explore | ¥119 | 3× base / week |
| Build | ¥469 | 12× base / week |

**Go:** Published regular monthly price; first-month offer ended. Regional Go = 1×; shared weekly allowance across models/tools with a five-hour window too. Windows start on first use; next use after expiry starts a new window.

[Official source](https://platform.minimax.cn/docs/m-plan/monthly-offer) · [Limits & billing notes](docs/providers/minimax-cn.md)

</details>

<a id="kimi"></a>
<details>
<summary><strong>Kimi Code</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Plus | $19 | Undisclosed |
| Pro | $39 | Undisclosed |
| Max | $99 | Undisclosed |
| Ultra | $199 | Undisclosed |

**Plus:** International new plan: rolling five-hour limit plus shared monthly pool, quantities undisclosed; no weekly cap for new subscribers. Legacy rules differ; annual equivalents and paid Extra Usage excluded.

[Official source](https://www.kimi.ai/resources/coding-plan) · [Limits & billing notes](docs/providers/kimi.md)

</details>

<a id="kiro"></a>
<details>
<summary><strong>Kiro</strong></summary>

Verified: 2026-11-22 · Verified

| Plan | / month | Allowance |
| :-- | --: | :-- |
| Free | $0 | 50 credits / month |
| Pro | $20 | 1,000 credits / month |
| Pro+ | $40 | 2,000 credits / month |
| Pro Max | $100 | 5,000 credits / month |
| Power | $200 | 10,000 credits / month |

**Pro:** Plan credits renew at the next billing cycle; tasks consume fractional credits, not a one-credit-per-request allowance. Trial and purchased credits excluded.

[Official source](https://kiro.dev/pricing/) · [Limits & billing notes](docs/providers/kiro.md)

</details>

## Updates & corrections

GitHub Actions fetches official sources, validates prices and quotas, counts votes, then generates these documents daily. Failed parsing keeps prior values marked for review. Changes are traceable in Git history.

[Report an error](https://github.com/tageecc/coding-plan-rank/issues/new?template=data-correction.yml) · [Automation status](https://github.com/tageecc/coding-plan-rank/actions/workflows/update.yml) · [Contribute](CONTRIBUTING.md)

Inspired by the comparison use case in [awesome-coding-plan](https://github.com/mahonzhan/awesome-coding-plan). Official data is independently verified; its benchmark measurements are not reused. Code and original compilation: [MIT](LICENSE).
