import { redirect } from 'next/navigation';

export default function UserPlaceholder() {
  redirect('/user/dashboard');
}
