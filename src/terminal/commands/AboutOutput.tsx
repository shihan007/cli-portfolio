import { profile } from '../../data/profile'
import styles from './commands.module.css'
import BinaryArt from './BinaryArt'

export default function AboutOutput() {
  return (
    <div className={styles.aboutLayout}>
      <div className={styles.binaryArtWrap}>
        <BinaryArt src="/avatar.jpeg" cols={52} threshold={100} />
      </div>
      <div className={styles.block}>
        <p><span className={styles.label}>name</span>     {profile.name}</p>
        <p><span className={styles.label}>title</span>    {profile.title}</p>
        <p><span className={styles.label}>location</span> {profile.location}</p>
        <p className={styles.bio}>{profile.bio}</p>
      </div>
    </div>
  )
}
