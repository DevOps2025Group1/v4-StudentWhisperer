import * as React from "react"
import { ProfilePopup } from '@/components/ui/ProfilePopup';

interface ProfileIconProps {
  // Add any props if needed in the future
}

const ProfileIcon: React.FC<ProfileIconProps> = () => {
  const [showProfile, setShowProfile] = React.useState<boolean>(false);

  return (
    <>
      <div 
        className="profile-icon" 
        onClick={() => setShowProfile(!showProfile)}
        title="Your Profile"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      {showProfile && <ProfilePopup onClose={() => setShowProfile(false)} />}
    </>
  );
};

export { ProfileIcon }
