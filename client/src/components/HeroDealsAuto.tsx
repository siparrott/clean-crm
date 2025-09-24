import React from "react";
import "@/styles/naf-hero-deals.css";

type AnyObj = Record<string, any>;

function pick<T = any>(o: AnyObj, keys: string[], fallback?: any): T {
  for (const k of keys) if (o && o[k] != null && o[k] !== "") return o[k];
  return fallback as T;
}

function normalize(item: AnyObj) {
  const imageUrl = pick<string>(item, ["imageUrl", "image_url", "image", "heroImageUrl", "cover", "photo"]);
  const title    = pick<string>(item, ["name", "title", "label"]);
  const url      = pick<string>(item, ["url", "href", "link", "path", "permalink", "detailsUrl", "route"]);
  const price    = Number(pick<number>(item, ["salePrice", "price", "currentPrice", "amount", "discountPrice"], 0));
  const compare  = Number(pick<number>(item, ["compareAtPrice", "originalPrice", "was", "rrp"], 0));
  const ribbon   = pick<string>(item, ["ribbonText", "badge", "tag"], "");
  const id       = String(pick<string>(item, ["id", "uuid", "slug"], title || url || Math.random().toString(36).slice(2)));
  const dataId   = pick<string>(item, ["dataVoucherId", "voucherId", "id"], id);
  const subtitle = pick<string>(item, ["subtitle", "tagline", "shortDescription", "excerpt", "description"], "");
  return { id, imageUrl, title, url, price, compareAt: isNaN(compare) ? undefined : compare, ribbonText: ribbon, dataVoucherId: dataId, subtitle };
}

function pctSave(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return null;
  return `${Math.round(((compareAt - price) / compareAt) * 100)}% SPAREN`;
}

export default function HeroDealsAuto({ items }: { items: AnyObj[] }) {
  const top3 = (items || []).slice(0, 3).map(normalize).filter(v => v.imageUrl && v.title && v.url);
  if (!top3.length) return null;

  return (
    <section className="naf-hero-wrap" aria-label="Top vouchers">
      <div className="naf-hero-grid">
        {top3.map(v => {
          const save = pctSave(v.price, v.compareAt);
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
                  {v.compareAt ? <span className="naf-old">€{v.compareAt.toFixed(2)}</span> : null}
                  <span className="naf-new">€{v.price.toFixed(2)}</span>
                  {save && <span className="naf-save">{save}</span>}
                </div>
                <div className="naf-cta-row">
                  <a href={v.url} className="naf-btn book-button" data-voucher-id={v.dataVoucherId}>
                    Book Now
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
