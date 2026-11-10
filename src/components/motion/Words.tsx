import { Fragment } from "react";
import styles from "./Words.module.css";

/** Renders each word in its own span so GSAP can animate words individually. */
export default function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span data-split className={styles.w}>
            {word}
          </span>
        </Fragment>
      ))}
    </>
  );
}
