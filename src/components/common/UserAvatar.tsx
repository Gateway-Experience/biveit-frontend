import { Avatar, AvatarFallback, AvatarImage } from 'src/components/shadui/avatar';
import { getAvatarUrl, getDisplayName } from 'src/services/user';
import type { User } from 'src/types/user';

// The user's picture, or the first letter of their name when they have none.
export default function UserAvatar({ user, className }: { user?: User | null; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarImage src={getAvatarUrl(user)} />
      <AvatarFallback>{(getDisplayName(user) || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
