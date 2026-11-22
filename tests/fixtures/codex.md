## Pricing options

<ContentSwitcher
  id="codex-pricing-plans"
  initialValue="individual"
  options={[
    {
      label: "Individual",
      value: "individual",
    },
    {
      label: "Business / Enterprise",
      value: "business-enterprise",
    },
  ]}
>




      <PricingCard
        name="Free"
        subtitle="Explore Codex capabilities on quick coding tasks."
        price="$0"
        interval="/month"
        ctaLabel="Get Free"
        ctaHref="https://chatgpt.com/plans/free/"
      >
        - GPT-6 Luna at Standard speed in the desktop app, subject to rollout
      </PricingCard>
      <PricingCard
        name="Go"
        subtitle="Use Codex for lightweight coding tasks."
        price="$8"
        interval="/month"
        ctaLabel="Get Go"
        ctaHref="https://chatgpt.com/plans/go"
      >
        - GPT-6 Luna at Standard speed in the desktop app, subject to rollout
      </PricingCard>
      <PricingCard
        name="Plus"
        subtitle="Power a few focused coding sessions each week."
        price="$20"
        interval="/month"
        ctaLabel="Get Plus"
        ctaHref="https://chatgpt.com/explore/plus?utm_internal_source=openai_developers_codex"
      >

        - Codex on the web, in the CLI, in the IDE extension, and on iOS
        - Cloud-based integrations like automatic code review and Slack
          integration
        - GPT-6.1 Sol and GPT-6 Luna
        - Flexibly extend usage with [ChatGPT credits](#credits-overview)
        - Other [ChatGPT features](https://chatgpt.com/pricing) as part of the
          Plus plan

      </PricingCard>
      <PricingCard
        name="Pro"
        subtitle="Choose the Pro plan that fits your usage."
        priceEyebrow="From"
        price="$100"
        interval="/month"
        ctaLabel="Get Pro"
        ctaHref="https://chatgpt.com/explore/pro?utm_internal_source=openai_developers_codex"
        highlight="Everything in Plus and:"
        footnoteLabel="Compare Pro plans and usage limits."
        footnoteHref="https://help.openai.com/en/articles/9793128-about-chatgpt-pro-plans"
      >

        - Plans at $100, $200, or $500 USD per month
        - [Ultrafast mode](https://learn.chatgpt.com/docs/agent-configuration/speed#ultrafast-mode)
          access on Pro $500
        - Other [ChatGPT features](https://chatgpt.com/pricing) as part of the
          Pro plan

      </PricingCard>
      <PricingCard
        name="API Key"
        subtitle="Great for automation in shared environments like CI."
        price=""
        interval=""
        ctaLabel="Learn more"
        ctaHref="/codex/auth"
        highlight=""
      >

        - Codex in the CLI, SDK, or IDE extension
        - No cloud-based features (GitHub code review, Slack, etc.)
        - Model availability follows the API models available to your key
        - Pay for Codex usage based on [API pricing](https://developers.openai.com/api/docs/pricing)

      </PricingCard>










      <PricingCard
        name="Business"
        subtitle="Bring Codex into your startup or growing business."
        price="$20"
        interval="/ user / month*"
        ctaLabel="Get Business"
        ctaHref="https://chatgpt.com/team-sign-up"
        footnoteLabel="*2+ users, billed annually. $25 per user per month when billed monthly."
      >

        - Access ChatGPT and Codex across desktop and mobile apps
        - Larger virtual machines to run cloud chats faster
        - Flexibly extend usage with [ChatGPT credits](#credits-overview)
        - A secure, dedicated workspace with essential admin controls, SAML SSO,
          and MFA
        - No training on your business data by default. [Learn
          more](https://openai.com/business-data/)
        - Other [ChatGPT features](https://chatgpt.com/pricing) as part of the
          Business plan

      </PricingCard>
      <PricingCard
        name="Enterprise & Edu"
        subtitle="Unlock Codex for your entire organization with enterprise-grade functionality."
        interval=""
        ctaLabel="Contact sales"
        ctaHref="https://chatgpt.com/contact-sales?utm_internal_source=openai_developers_codex"
        highlight="Everything in Business and:"
      >

        - Priority request processing
        - Enterprise-level security and controls, including SCIM, EKM, user
          analytics, domain verification, and role-based access control
          ([RBAC](https://help.openai.com/en/articles/11750701-rbac))
        - Audit logs and usage monitoring via the [Compliance
          API](https://chatgpt.com/public/admin/api-reference#tag/Codex%20Tasks)
        - Data retention and data residency controls
        - Other [ChatGPT features](https://chatgpt.com/pricing) as part of the
          Enterprise plan

      </PricingCard>





      <PricingCard
        class="codex-pricing-card--span-two"
        name="API Key"
        subtitle="Great for automation in shared environments like CI."
        price=""
        interval=""
        ctaLabel="Learn more"
        ctaHref="/codex/auth"
        highlight=""
      >

        - Codex in the CLI, SDK, or IDE extension
        - No cloud-based features (GitHub code review, Slack, etc.)
        - Model availability follows the API models available to your key
        - Pay for Codex usage based on [API pricing](https://developers.openai.com/api/docs/pricing)

      </PricingCard>





</ContentSwitcher>

## Included usage

<a id="what-are-the-usage-limits-for-my-plan"></a>

The number of messages you can send depends on the model used, size and
complexity of your tasks, and whether you run them locally or in the cloud.
Small scripts or routine functions may consume only a fraction of your
allowance, while larger projects, long-running tasks, or extended sessions that
require the agent to hold more context will use significantly more per message.

Tasks that look similar can consume different amounts of your allowance. Model
choice, context, reasoning, tool use, retrieval, and caching all affect usage,
so prompt length alone isn't a reliable estimate.

For model guidance, see [GPT-6.1 Sol](https://learn.chatgpt.com/docs/models#gpt-61-sol),
[GPT-6.2 Sol](https://learn.chatgpt.com/docs/models#app-gpt-62-sol), and [Models](https://learn.chatgpt.com/docs/models).




The estimates below show local messages per five-hour period for Plus and
Standard Business. Pro plans currently have no five-hour limit. Cloud tasks
may use more of your allowance than local messages. Usage depends on the model
and task. These estimates are not fixed message limits; check your
[usage dashboard](#where-can-i-see-my-current-usage-limits) for current limits
and reset times.




<TableWrapper class="w-full">
  <thead class="whitespace-nowrap">
    <tr>
      <th scope="col">Model</th>
      <th scope="col" style="text-align:center">
        Plus
      </th>
      <th scope="col" style="text-align:center">
        Standard Business
      </th>
    </tr>
  </thead>
  <tbody class="whitespace-nowrap">
    <tr>
      <td>GPT-6.2 Astra</td>
      <td style="text-align:center">6-50</td>
      <td style="text-align:center">6-50</td>
    </tr>
    <tr>
      <td>GPT-6.2 Sol</td>
      <td style="text-align:center">17-180</td>
      <td style="text-align:center">17-180</td>
    </tr>
    <tr>
      <td>GPT-6 Astra</td>
      <td style="text-align:center">5-45</td>
      <td style="text-align:center">5-45</td>
    </tr>
    <tr>
      <td>GPT-6.1 Sol</td>
      <td style="text-align:center">15-160</td>
      <td style="text-align:center">15-160</td>
    </tr>
    <tr>
      <td>GPT-6.1 Terra</td>
      <td style="text-align:center">35-285</td>
      <td style="text-align:center">35-285</td>
    </tr>
    <tr>
      <td>GPT-6 Sol</td>
      <td style="text-align:center">15-150</td>
      <td style="text-align:center">15-150</td>
    </tr>
    <tr>
      <td>GPT-6 Luna</td>
      <td style="text-align:center">350-3,000</td>
      <td style="text-align:center">350-3,000</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="3" style="text-align:center">
        Local messages and cloud chats share your plan's usage allowance. Weekly
        limits may also apply.
      </td>
    </tr>
    <tr>
      <td colspan="3" style="text-align:center">
        Enterprise/Edu users with flexible pricing have no fixed rate limits.
        Usage scales with [credits](#credits-overview).
      </td>
    </tr>
    <tr>
      <td colspan="3" style="text-align:center">
        Enterprise and Edu plans without flexible pricing have the same per-seat
        usage limits as Plus for most features.
      </td>
    </tr>
  </tfoot>
</TableWrapper>

Usage limits are shared with other agentic features once pricing for those
features is effective. This currently includes [ChatGPT for
Excel](https://help.openai.com/articles/20001063) on Plus and Pro.

GPT-6.1 Sol usage drawn from your subscription has no long-context surcharge
in Codex or ChatGPT Work.


## Speed multipliers
