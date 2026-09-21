import { CommsChannelList } from "../components/comms/CommsChannelList";
import { Header } from "../components/layout/Header";
import { PartyRoster } from "../components/membership/PartyRoster";
import { MissionLog } from "../components/mission/MissionLog";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.wrap}>
      <Header />
      <MissionLog />
      <CommsChannelList />
      <PartyRoster />
      <p className={styles.footer}>PRESS ADD TO RECRUIT A NEW MEMBER</p>
    </div>
  );
}
