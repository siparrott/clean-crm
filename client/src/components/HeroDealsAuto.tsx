import React from "react";
import "@/styles/naf-hero-deals.css";
import { useLanguage } from "@/context/LanguageContext";

type AnyObj = Record<string, any>;

function pick<T = any>(o: AnyObj, keys: string[], fallback?: any): T {
  for (const k of keys) if (o && o[k] != null && o[k] !== "") return o[k];
  return fallback as T;
}

function normalize(item: AnyObj) {
  const imageUrl = pick<string>(item, ["imageUrl", "image_url", "image", "heroImageUrl", "cover", "photo"]);
  const title    = pick<string>(item, ["name", "title", "label"]);
  const url      = pick<string>(item, ["url", "href", "link", "path", "permalink", "detailsUrl", "route"]);

  // Start with broad guesses
  let current = Number(pick<number>(item, ["salePrice", "discountPrice", "price", "currentPrice", "amount"], 0));
  let compare = Number(pick<number>(item, ["originalPrice", "compareAtPrice", "was", "rrp", "listPrice"], 0));

  // Heuristics: if both discountPrice/salePrice and price exist and discount < price, treat price as original
  const hasPrice = Object.prototype.hasOwnProperty.call(item, "price");
  const hasDiscount = Object.prototype.hasOwnProperty.call(item, "discountPrice");
  const hasSale = Object.prototype.hasOwnProperty.call(item, "salePrice");

  if ((!compare || compare <= 0) && hasPrice && (hasDiscount || hasSale)) {
    const p = Number(item.price);
    const dp = hasDiscount ? Number(item.discountPrice) : Number(item.salePrice);
    if (isFinite(p) && isFinite(dp) && p > 0 && dp > 0 && dp < p) {
      current = dp;
      compare = p;
    }
  }

  // Ensure numbers are sane
  const price = isFinite(current) ? current : 0;
  const compareAt = isFinite(compare) && compare > 0 ? compare : undefined;

  const ribbon   = pick<string>(item, ["ribbonText", "badge", "tag"], "");
  const id       = String(pick<string>(item, ["id", "uuid", "slug"], title || url || Math.random().toString(36).slice(2)));
  const dataId   = pick<string>(item, ["dataVoucherId", "voucherId", "id"], id);
  const subtitle = pick<string>(item, ["subtitle", "tagline", "shortDescription", "excerpt", "description"], "");
  return { id, imageUrl, title, url, price, compareAt, ribbonText: ribbon, dataVoucherId: dataId, subtitle };
}

function pctSave(price: number, compareAt: number | undefined, language: 'en' | 'de') {
  if (!compareAt || compareAt <= price) return null;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  const suffix = language === 'de' ? 'SPAREN' : 'OFF';
  return `${pct}% ${suffix}`;
}

export default function HeroDealsAuto({ items }: { items: AnyObj[] }) {
  const { t, language } = useLanguage();
  const top3 = (items || []).slice(0, 3).map(normalize).filter(v => v.imageUrl && v.title && v.url);
  if (!top3.length) return null;

  const formatter = new Intl.NumberFormat(language === 'de' ? 'de-AT' : 'en-AT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });

  return (
    <section className="naf-hero-wrap" aria-label="Top vouchers">
      <div className="naf-hero-grid">
        {top3.map(v => {
          const save = pctSave(v.price, v.compareAt, language);
          return (
            <article key={v.id} className="naf-card">
              <div className="naf-card-media">
                <img src={v.imageUrl} alt={v.title} loading="lazy" />
                {v.ribbonText && <div className="naf-ribbon">{v.ribbonText}</div>}
              </div>
              <div className="naf-card-body">
                <h3 className="naf-title">{v.title}</h3>
                {v.subtitle && <p className="naf-sub">{v.subtitle}</p>}
                <div className="naf-price-row">
                  {v.compareAt ? <span className="naf-old">{formatter.format(v.compareAt)}</span> : null}
                  <span className="naf-new">{formatter.format(v.price)}</span>
                  {save && <span className="naf-save">{save}</span>}
                </div>
                <div className="naf-cta-row">
                  <a href={v.url} className="naf-btn book-button" data-voucher-id={v.dataVoucherId} aria-label={t('home.bookNowButton')}>
                    {t('home.bookNowButton')}
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
