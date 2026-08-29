import { Suspense } from 'react';
import styles from '../memory.module.css';
import CompilerInspector from './CompilerInspector';

export default function CompilerInspectorPage() {
  return (
    <>
      <div className={styles.pageHeader}>
        <span className={styles.pageKicker}>04 / Compiler Inspector</span>
        <h1 className={styles.pageTitle}>Intent in, Cypher out.</h1>
        <p className={styles.pageLede}>
          Every query the compiler emits is a pre-written, unit-tested template — never
          LLM-generated, never string-concatenated. This is the whole pipeline, one screen.
        </p>
      </div>

      <Suspense
        fallback={
          <div className={styles.skeleton}>
            <div className={styles.skeletonLine} style={{ width: '60%' }} />
            <div className={styles.skeletonLine} style={{ width: '40%' }} />
          </div>
        }
      >
        <CompilerInspector />
      </Suspense>
    </>
  );
}
