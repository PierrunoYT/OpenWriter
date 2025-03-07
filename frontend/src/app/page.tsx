import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the app directly
  redirect('/app');
  
  // This part won't be executed due to the redirect
  return null;
}
