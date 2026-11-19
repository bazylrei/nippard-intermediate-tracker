import BackLink from "./BackLink";

const PROFILE_PATH = "/profile";

/** The back arrow on pages opened from Profile (Program, Programs, Exercises, Settings). */
export default function BackToProfile() {
  return <BackLink href={PROFILE_PATH} label="Back to Profile" />;
}
