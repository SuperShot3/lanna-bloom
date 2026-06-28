/** Static reference for admins — what Marketing Insights shows and how to read it. */
export function MarketingKnowledgeBase() {
  return (
    <section className="admin-accounting-info-section">
      <h2 className="admin-accounting-info-heading">Marketing Insights — guide</h2>
      <p className="admin-hint" style={{ marginTop: 0 }}>
        Plain-language reference for the <strong>/admin/marketing</strong> dashboard. Read-only analytics
        unless you approve and apply recommendations (owner only).
      </p>

      <h3 className="admin-accounting-info-heading" style={{ fontSize: '0.98rem', marginTop: 20 }}>
        What each tab does
      </h3>
      <ul className="admin-accounting-info-list">
        <li>
          <strong>Diagnostics</strong> (default) — Compares real paid orders in Supabase with GA4 purchase
          events and Google Ads conversions/spend for the selected period. Shows a verdict (healthy, warning,
          or error) with suggested next checks, plus tracking health checks.
        </li>
        <li>
          <strong>Google Ads</strong> — Campaign performance from the Google Ads API: spend, clicks,
          impressions, conversions, CPA, ROAS. Tables for campaigns, ad groups, keywords, search terms, and
          landing pages. Use the waste filter to show keywords/search terms with spend but zero conversions.
        </li>
        <li>
          <strong>Funnel &amp; tracking</strong> — Checkout steps from GA4 (view item → purchase), conversion
          rates between steps, paid vs organic session stats, and which URLs paid traffic lands on.
        </li>
        <li>
          <strong>Recommendations</strong> — Rule-based (and optional AI) suggestions to pause wasteful
          keywords, add negatives, etc. Owners can approve and apply supported changes directly to Google
          Ads.
        </li>
        <li>
          <strong>Campaign Builder</strong> — Describe a Search campaign in English; the system asks follow-up
          questions and drafts keywords, negatives, and ad copy. Owners can validate and create a{' '}
          <strong>paused</strong> campaign in Google Ads (never auto-enabled).
        </li>
      </ul>

      <h3 className="admin-accounting-info-heading" style={{ fontSize: '0.98rem', marginTop: 20 }}>
        Acronyms &amp; metrics
      </h3>
      <ul className="admin-accounting-info-list">
        <li>
          <strong>GA4</strong> — Google Analytics 4. Browser events (add to cart, purchase, etc.) sent via GTM.
        </li>
        <li>
          <strong>GTM</strong> — Google Tag Manager. Loads tags in production; fires custom events like{' '}
          <code>purchase</code> on the thank-you page.
        </li>
        <li>
          <strong>CPA</strong> — Cost per acquisition. Ad spend ÷ conversions (lower is better if conversions
          are real purchases).
        </li>
        <li>
          <strong>ROAS</strong> — Return on ad spend. Conversion value ÷ spend (e.g. 3.0× = ฿3 revenue per ฿1
          spent). Needs accurate conversion values in Ads.
        </li>
        <li>
          <strong>CTR</strong> — Click-through rate. Clicks ÷ impressions.
        </li>
        <li>
          <strong>CPC / Avg CPC</strong> — Cost per click. Spend ÷ clicks.
        </li>
        <li>
          <strong>Conv.</strong> — Conversions counted by Google Ads (usually purchase actions you configured).
        </li>
        <li>
          <strong>Supabase paid orders</strong> — Ground truth: orders marked paid in your database. If Ads/GA4
          disagree with this, tracking is likely broken.
        </li>
      </ul>

      <h3 className="admin-accounting-info-heading" style={{ fontSize: '0.98rem', marginTop: 20 }}>
        Checkout funnel table — column meanings
      </h3>
      <p>
        Rows follow the shopping path: View item → Add to cart → View cart → Begin checkout → Shipping info →
        Payment click → Purchase. Each row is a GA4 event count for the selected period (all traffic, not only
        ads).
      </p>
      <ul className="admin-accounting-info-list">
        <li>
          <strong>Events</strong> — How many times that step fired in GA4.
        </li>
        <li>
          <strong>Kept from prev step</strong> — Of users who reached the <em>previous</em> step, what % also
          reached this step. Example: 50 add-to-cart and 25 begin checkout → 50% kept from prev step. A big drop
          here shows where people leave.
        </li>
        <li>
          <strong>Kept from start</strong> — Of users who viewed a product (first step), what % reached this
          step. Shows overall funnel survival from the top.
        </li>
        <li>
          <strong>Lost from prev step</strong> — % who did the previous step but <em>not</em> this one (the
          drop-off). High loss after “View cart” or “Begin checkout” often means cart/checkout friction on
          mobile.
        </li>
      </ul>
      <p className="admin-hint">
        Below the table: <strong>Paid sessions</strong> / <strong>Organic sessions</strong> are session counts
        by channel; <strong>Paid conv. rate</strong> and <strong>Organic conv. rate</strong> are purchases ÷
        sessions for that channel.
      </p>

      <h3 className="admin-accounting-info-heading" style={{ fontSize: '0.98rem', marginTop: 20 }}>
        Paid landing pages — yellow “Thai URL” badge
      </h3>
      <p>
        Lists the first page URL seen in GA4 for sessions attributed to <strong>Paid</strong> channel (Google
        Ads, etc.). Sessions, add-to-cart, and purchases are counted per landing path.
      </p>
      <p>
        A yellow <strong>Thai URL</strong> badge means the path contains <code>/th/</code> (Thai storefront).
        English Search campaigns should usually send clicks to <code>/en/</code> product or catalog pages. If
        ads point to Thai URLs, you may pay for English-intent clicks that land on Thai copy — hurting
        conversion and making funnel data harder to interpret.
      </p>

      <h3 className="admin-accounting-info-heading" style={{ fontSize: '0.98rem', marginTop: 20 }}>
        Diagnostics verdict — common messages
      </h3>
      <ul className="admin-accounting-info-list">
        <li>
          <strong>Google Ads conversion tracking may be broken</strong> — Many Supabase orders but almost no
          Ads conversions. Fix GTM/Ads purchase tags before trusting ROAS or auto-bidding.
        </li>
        <li>
          <strong>Traffic arrives but users are not engaging</strong> — Clicks but no cart activity. Check
          landing page relevance and delivery-area messaging.
        </li>
        <li>
          <strong>Cart interest but checkout drop-off</strong> — Add-to-cart without begin checkout. Test cart
          → checkout on a phone.
        </li>
        <li>
          <strong>Payments started but purchase event missing</strong> — Payment clicks in GA4 but zero
          purchases. Thank-you page GTM trigger may be broken.
        </li>
        <li>
          <strong>Paid traffic converts worse than organic</strong> — Paid session purchase rate much lower
          than organic. Review keywords, search terms, and landing URLs.
        </li>
      </ul>

      <h3 className="admin-accounting-info-heading" style={{ fontSize: '0.98rem', marginTop: 20 }}>
        What needs which integration
      </h3>
      <ul className="admin-accounting-info-list">
        <li>
          <strong>Google Ads API</strong> — Ads tab, recommendations apply, Campaign Builder, Ads columns on
          Diagnostics.
        </li>
        <li>
          <strong>GA4 Data API</strong> — Diagnostics (except Ads-specific numbers), Funnel tab, tracking
          health.
        </li>
        <li>
          <strong>OpenAI</strong> (optional) — Richer recommendation text and Campaign Builder copy. Rules
          still run without it.
        </li>
        <li>
          <strong>Supabase</strong> — Paid-order counts on Diagnostics; stores recommendations and campaign
          drafts.
        </li>
      </ul>

      <h3 className="admin-accounting-info-heading" style={{ fontSize: '0.98rem', marginTop: 20 }}>
        Limits &amp; caveats
      </h3>
      <ul className="admin-accounting-info-list">
        <li>Data is cached ~15 minutes and depends on GA4/Ads reporting delay (often 24–48h for Ads).</li>
        <li>GA4 events reflect browser firing — ad blockers and consent can reduce counts vs Supabase orders.</li>
        <li>Recommendations that change live Ads require <strong>owner</strong> role; apply is guarded by safety limits.</li>
        <li>Campaign Builder creates <strong>paused</strong> English Search campaigns only; max daily budget is capped server-side.</li>
        <li>Period selector (7 / 14 / 30 days) applies to tabs that load API data, not the recommendations list.</li>
      </ul>

      <p className="admin-hint" style={{ marginTop: '1rem' }}>
        Developer runbooks: <code>docs/ANALYTICS_GA4.md</code>,{' '}
        <code>docs/GOOGLE_ADS_PURCHASE_CONVERSION.md</code>
      </p>
    </section>
  );
}
