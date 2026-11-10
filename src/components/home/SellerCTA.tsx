import { ButtonLink } from "@/components/ui/Button";
import Sticker from "@/components/ui/Sticker";
import styles from "./SellerCTA.module.css";

export default function SellerCTA() {
  return (
    <section className={styles.cta}>
      <div className={`wrap ${styles.grid}`}>
        <div>
          <p className="hand" style={{ color: "var(--terracotta)" }}>
            for the ones who make things
          </p>
          <h2>
            Make something at home? <span className="hl">Pin a tag.</span>
          </h2>
          <p>
            List your first product in ten minutes. No shop to build, and nothing to
            pay until you sell.
          </p>
          <ButtonLink variant="ink" href="/sell">
            Pin your first tag →
          </ButtonLink>
        </div>

        <aside className={styles.visit} aria-label="Example seller card">
          <Sticker variant="red" rotate="8deg" style={{ top: "-16px", right: "-14px" }}>
            you, soon
          </Sticker>
          <h3>Meena&apos;s Kitchen</h3>
          <p className="hand">baking since 5am</p>
          <dl>
            <dt>Andheri West · </dt>
            <dd>baker</dd>
            <br />
            <dt>★ 4.8 · </dt>
            <dd>112 orders</dd>
          </dl>
        </aside>
      </div>
    </section>
  );
}