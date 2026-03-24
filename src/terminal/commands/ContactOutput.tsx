import { profile } from '../../data/profile'
import styles from './commands.module.css'

export default function ContactOutput() {
  return (
    <div className={styles.block}>
      <p><span className={styles.label}>email</span>     <a className={styles.link} href={`mailto:${profile.email}`}>{profile.email}</a></p>
      <p><span className={styles.label}>linkedin</span>  <a className={styles.link} href={profile.linkedin} target="_blank" rel="noreferrer">{profile.linkedin}</a></p>
      <p><span className={styles.label}>behance</span>   <a className={styles.link} href={profile.behance} target="_blank" rel="noreferrer">{profile.behance}</a></p>
      <p><span className={styles.label}>dribbble</span>  <a className={styles.link} href={profile.dribbble} target="_blank" rel="noreferrer">{profile.dribbble}</a></p>
      <p><span className={styles.label}>instagram</span> <a className={styles.link} href={profile.instagram} target="_blank" rel="noreferrer">{profile.instagram}</a></p>
      {profile.website && (
        <p><span className={styles.label}>web</span>      <a className={styles.link} href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a></p>
      )}
    </div>
  )
}
