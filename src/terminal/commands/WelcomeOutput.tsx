import styles from './commands.module.css'
import { profile } from '../../data/profile'

export default function WelcomeOutput() {
  const now = new Date().toLocaleString()
  return (
    <div className={styles.welcome}>
      <pre className={styles.ascii}>{`  =*########*+     *##*         *##*     *##########*=
 *############+   *####*     *####*    *############=
*####*..+####*=  *######* *######*    *####*    *####*
 +*##########=   *####*+#####*+####*  *####*    *####*
       .=*####*  *####*     *####*    *####*    *####*
+####*..#####*   *####*     *####*    *############=
 =*#########*=   *####*     *####*    *##########*.`}</pre>
      <p className={styles.welcomeName}>{profile.name}</p>
      <p className={styles.welcomeTitle}>{profile.title}</p>
      <p className={styles.welcomeMeta}>System ready — {now}</p>
      <p className={styles.welcomeHint}>
        Type <span className={styles.cmd}>/help</span> to see available commands.
      </p>
    </div>
  )
}
